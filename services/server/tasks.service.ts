import 'server-only';

import { familySubcollections, firestoreCollections } from '@/types/domain';
import { adminDb, verifyAdminSessionCookie } from '@/lib/firebase-admin';
import { assertDateKey } from '@/services/task-date';
import {
  canUserEditTask,
  canUserSeeTask,
  isTaskDueOnDate,
  resolveTaskVisibleToUserIds,
  toTaskOverviewItem,
} from '@/services/tasks.logic';
import { appendThreadMetaToOverview, createDelegationSystemMessage } from '@/services/server/task-chat.service';
import { isSuperuserProfile, resolveAccountStatus } from '@/services/user-profile.service';
import type { AppUserProfile, FamilyDocument } from '@/types/partner-flow';
import type { QuizCategory } from '@/types/quiz';
import type {
  CreateTaskInput,
  SaveTaskDelegationInput,
  TaskDelegationDocument,
  TaskDocument,
  TaskOverviewItem,
  TaskOverviewResponse,
  TaskOverrideDocument,
  TaskRecurrenceConfig,
  TaskRecurrenceType,
  TaskWeekday,
  UpdateTaskInput,
  UpdateTaskInstanceInput,
} from '@/types/tasks';

type TaskContext = {
  userId: string;
  profile: AppUserProfile;
  family: FamilyDocument;
  familyId: string;
  partnerUserId: string | null;
};

type ClearDelegationOptions = {
  date?: string | null;
  mode?: 'recurring' | 'singleDate';
};

function tasksCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.tasks);
}

function taskDelegationsCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.taskDelegations);
}

function taskOverridesCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.taskOverrides);
}

function ownershipCardsCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.ownershipCards);
}

function nowIso() {
  return new Date().toISOString();
}

function sortOverviewTasks(
  left: Pick<TaskDocument, 'recurrenceType' | 'selectedDate' | 'title' | 'updatedAt'>,
  right: Pick<TaskDocument, 'recurrenceType' | 'selectedDate' | 'title' | 'updatedAt'>,
) {
  const leftWeight = left.recurrenceType === 'none' ? (left.selectedDate ? 0 : 3) : 1;
  const rightWeight = right.recurrenceType === 'none' ? (right.selectedDate ? 0 : 3) : 1;
  if (leftWeight !== rightWeight) return leftWeight - rightWeight;
  if (left.updatedAt !== right.updatedAt) return right.updatedAt.localeCompare(left.updatedAt);
  return left.title.localeCompare(right.title, 'de');
}

function sortOverviewItems(left: TaskOverviewItem, right: TaskOverviewItem) {
  if (left.isCompleted !== right.isCompleted) {
    return left.isCompleted ? 1 : -1;
  }
  return sortOverviewTasks(left, right);
}

function sortDayTasks(left: TaskOverviewItem, right: TaskOverviewItem) {
  if (left.taskType !== right.taskType) {
    return left.taskType === 'dayTask' ? -1 : 1;
  }
  return sortOverviewItems(left, right);
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalDate(value?: string | null) {
  if (!value) return null;
  assertDateKey(value);
  return value;
}

function normalizeWeekdays(weekdays?: TaskWeekday[] | null) {
  if (!weekdays?.length) return null;
  return [...new Set(weekdays)] as TaskWeekday[];
}

function normalizeRecurrenceConfig(type: TaskRecurrenceType, recurrenceConfig?: TaskRecurrenceConfig | null) {
  if (type === 'none') return null;

  if (type === 'daily' || type === 'weekly') {
    return {
      weekdays: normalizeWeekdays(recurrenceConfig?.weekdays) ?? undefined,
    };
  }

  if (type === 'monthly') {
    return {
      monthlyPattern: recurrenceConfig?.monthlyPattern ?? undefined,
    };
  }

  if (type === 'quarterly') {
    return {
      quarterlyPattern: recurrenceConfig?.quarterlyPattern ?? undefined,
    };
  }

  if (type === 'yearly') {
    return {
      yearlyMonth: recurrenceConfig?.yearlyMonth ?? undefined,
      yearlyDay: recurrenceConfig?.yearlyDay ?? undefined,
    };
  }

  return null;
}

async function resolveTaskContext(userId: string): Promise<TaskContext> {
  const profileSnapshot = await adminDb.collection(firestoreCollections.users).doc(userId).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() as AppUserProfile : null;

  if (!profile || resolveAccountStatus(profile) !== 'active') {
    throw new TaskAccessError('Kein aktives Nutzerprofil gefunden.', 403);
  }

  if (!isSuperuserProfile(profile)) {
    throw new TaskAccessError('Dieses Feature ist nur für Superuser freigeschaltet.', 403);
  }

  const familyId = profile.familyId?.trim();
  if (!familyId) {
    throw new TaskAccessError('Keine Familie mit diesem Konto verknüpft.', 403);
  }

  const familySnapshot = await adminDb.collection(firestoreCollections.families).doc(familyId).get();
  const family = familySnapshot.exists ? familySnapshot.data() as FamilyDocument : null;

  if (!family) {
    throw new TaskAccessError('Familie konnte nicht geladen werden.', 404);
  }

  const isMember = family.initiatorUserId === userId || family.partnerUserId === userId;
  if (!isMember) {
    throw new TaskAccessError('Kein Zugriff auf diese Familie.', 403);
  }

  return {
    userId,
    profile,
    family,
    familyId,
    partnerUserId: family.initiatorUserId === userId ? family.partnerUserId ?? null : family.initiatorUserId,
  };
}

async function resolveTaskContextFromCookie(sessionCookie?: string) {
  const decoded = await verifyAdminSessionCookie(sessionCookie);
  if (!decoded?.uid) {
    throw new TaskAccessError('Anmeldung erforderlich.', 401);
  }

  return resolveTaskContext(decoded.uid);
}

async function resolveResponsibilityCategory(familyId: string, responsibilityId?: string | null): Promise<QuizCategory | null> {
  if (!responsibilityId) return null;
  const snapshot = await ownershipCardsCollection(familyId).doc(responsibilityId).get();
  if (!snapshot.exists) {
    throw new TaskAccessError('Das Verantwortungsgebiet wurde nicht gefunden.', 404);
  }
  const responsibility = snapshot.data() as { categoryKey?: QuizCategory | null };
  return responsibility.categoryKey ?? null;
}

async function readFamilyTasks(familyId: string) {
  const snapshot = await tasksCollection(familyId).get();
  return snapshot.docs.map((entry) => ({ ...(entry.data() as TaskDocument), id: entry.id }));
}

async function readVisibleFamilyTasks(familyId: string, userId: string) {
  const [visibleSnapshot, createdBySnapshot, delegatedSnapshot] = await Promise.all([
    tasksCollection(familyId).where('visibleToUserIds', 'array-contains', userId).get(),
    tasksCollection(familyId).where('createdByUserId', '==', userId).get(),
    tasksCollection(familyId).where('delegatedToUserId', '==', userId).get(),
  ]);

  const byId = new Map<string, TaskDocument>();
  for (const entry of [...visibleSnapshot.docs, ...createdBySnapshot.docs, ...delegatedSnapshot.docs]) {
    byId.set(entry.id, { ...(entry.data() as TaskDocument), id: entry.id });
  }

  return [...byId.values()].filter((task) => !task.deletedAt && canUserSeeTask(task, userId));
}

async function readFamilyTaskDelegations(familyId: string) {
  const snapshot = await taskDelegationsCollection(familyId).get();
  return snapshot.docs.map((entry) => ({ ...(entry.data() as TaskDelegationDocument), id: entry.id }));
}

async function readFamilyTaskOverrides(familyId: string) {
  const snapshot = await taskOverridesCollection(familyId).get();
  return snapshot.docs.map((entry) => ({ ...(entry.data() as TaskOverrideDocument), id: entry.id }));
}

function groupDelegationsByTask(delegations: TaskDelegationDocument[]) {
  return delegations.reduce<Map<string, TaskDelegationDocument[]>>((map, delegation) => {
    const bucket = map.get(delegation.taskId) ?? [];
    bucket.push(delegation);
    map.set(delegation.taskId, bucket);
    return map;
  }, new Map());
}

function groupOverridesByTask(overrides: TaskOverrideDocument[]) {
  return overrides.reduce<Map<string, TaskOverrideDocument[]>>((map, override) => {
    const bucket = map.get(override.taskId) ?? [];
    bucket.push(override);
    map.set(override.taskId, bucket);
    return map;
  }, new Map());
}

async function resolveTaskById(context: TaskContext, taskId: string) {
  const snapshot = await tasksCollection(context.familyId).doc(taskId).get();
  if (!snapshot.exists) {
    throw new TaskAccessError('Aufgabe nicht gefunden.', 404);
  }
  const task = { ...(snapshot.data() as TaskDocument), id: snapshot.id };
  if (!canUserSeeTask(task, context.userId)) {
    throw new TaskAccessError('Kein Zugriff auf diese Aufgabe.', 403);
  }
  return task;
}

function assertTaskWriteAccess(task: TaskDocument, userId: string) {
  if (!canUserEditTask(task, userId)) {
    throw new TaskAccessError('Diese Aufgabe kann nur von der aktuell zugewiesenen Person bearbeitet werden.', 403);
  }
}

export class TaskAccessError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function getTaskContextFromSessionCookie(sessionCookie?: string) {
  return resolveTaskContextFromCookie(sessionCookie);
}

export async function getTasksForSelectedDate(familyId: string, userId: string, dateKey: string) {
  assertDateKey(dateKey);
  const context = await resolveTaskContext(userId);
  if (context.familyId !== familyId) {
    throw new TaskAccessError('Kein Zugriff auf diese Familie.', 403);
  }

  const [tasks, delegations, overrides] = await Promise.all([
    readVisibleFamilyTasks(familyId, userId),
    readFamilyTaskDelegations(familyId),
    readFamilyTaskOverrides(familyId),
  ]);

  const delegationsByTask = groupDelegationsByTask(delegations);
  const overridesByTask = groupOverridesByTask(overrides);

  return tasks
    .map((task) => toTaskOverviewItem(task, delegationsByTask.get(task.id) ?? [], overridesByTask.get(task.id) ?? [], dateKey))
    .filter((task) => task.isDueOnSelectedDate)
    .sort(sortDayTasks);
}

export async function getTaskOverviewForSelectedDate(userId: string, dateKey: string): Promise<TaskOverviewResponse> {
  const context = await resolveTaskContext(userId);
  const settled = await Promise.allSettled([
    readVisibleFamilyTasks(context.familyId, userId),
    readFamilyTaskDelegations(context.familyId),
    readFamilyTaskOverrides(context.familyId),
  ]);

  const [tasksResult, delegationsResult, overridesResult] = settled;
  if (tasksResult.status === 'rejected') throw tasksResult.reason;
  if (delegationsResult.status === 'rejected') throw delegationsResult.reason;
  if (overridesResult.status === 'rejected') throw overridesResult.reason;

  const tasks = tasksResult.value;
  const delegations = delegationsResult.value;
  const overrides = overridesResult.value;

  const delegationsByTask = groupDelegationsByTask(delegations);
  const overridesByTask = groupOverridesByTask(overrides);
  const dayTasks = tasks
    .map((task) => toTaskOverviewItem(task, delegationsByTask.get(task.id) ?? [], overridesByTask.get(task.id) ?? [], dateKey))
    .filter((task) => task.isDueOnSelectedDate)
    .sort(sortDayTasks);
  const responsibilityTasks = tasks
    .filter((task) => Boolean(task.responsibilityId))
    .map((task) => toTaskOverviewItem(task, delegationsByTask.get(task.id) ?? [], overridesByTask.get(task.id) ?? [], dateKey))
    .sort(sortOverviewItems);

  const overview = {
    selectedDate: dateKey,
    dayTasks,
    responsibilityTasks,
    tasks: dayTasks,
    responsibilities: responsibilityTasks,
    taskThreads: [],
    inbox: [],
    warnings: [] as string[],
  };

  return appendThreadMetaToOverview({
    familyId: context.familyId,
    userId,
    overview,
  });
}

export async function createTaskForUser(userId: string, input: CreateTaskInput) {
  const context = await resolveTaskContext(userId);
  const title = input.title.trim();

  if (!title) {
    throw new TaskAccessError('Bitte gib einen Titel für die Aufgabe ein.', 400);
  }

  const selectedDate = normalizeOptionalDate(input.selectedDate);
  const recurrenceType = input.recurrenceType ?? 'none';

  if (input.taskType === 'dayTask' && !selectedDate) {
    throw new TaskAccessError('Für eine einmalige Tagesaufgabe wird ein Datum benötigt.', 400);
  }

  if (input.taskType === 'responsibilityTask' && !input.responsibilityId) {
    throw new TaskAccessError('Für diese Aufgabe wird ein Verantwortungsgebiet benötigt.', 400);
  }

  const taskId = tasksCollection(context.familyId).doc().id;
  const categoryKey = input.categoryKey ?? await resolveResponsibilityCategory(context.familyId, input.responsibilityId);
  const timestamp = nowIso();

  const payload: TaskDocument = {
    id: taskId,
    familyId: context.familyId,
    responsibilityId: input.responsibilityId ?? null,
    categoryKey,
    title,
    notes: normalizeOptionalText(input.notes),
    creatorUserId: context.userId,
    createdByUserId: context.userId,
    assignedToUserId: context.userId,
    ownerUserId: context.userId,
    delegatedToUserId: null,
    delegatedByUserId: null,
    delegatedAt: null,
    visibilityMode: 'private',
    visibleToUserIds: [context.userId],
    taskType: input.taskType,
    selectedDate,
    recurrenceType,
    recurrenceConfig: normalizeRecurrenceConfig(recurrenceType, input.recurrenceConfig),
    endMode: input.endMode ?? 'never',
    endDate: normalizeOptionalDate(input.endDate),
    status: 'active',
    threadId: null,
    unreadForUserIds: [],
    lastMessageAt: null,
    lastMessagePreview: null,
    source: 'manual',
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await tasksCollection(context.familyId).doc(taskId).set(payload);
  return payload;
}

export async function updateTaskForUser(userId: string, taskId: string, input: UpdateTaskInput) {
  const context = await resolveTaskContext(userId);
  const existingTask = await resolveTaskById(context, taskId);
  assertTaskWriteAccess(existingTask, context.userId);

  const nextTitle = input.title !== undefined ? input.title.trim() : existingTask.title;
  if (!nextTitle) {
    throw new TaskAccessError('Bitte gib einen Titel für die Aufgabe ein.', 400);
  }

  const nextRecurrenceType = input.recurrenceType ?? existingTask.recurrenceType;
  const nextSelectedDate = input.selectedDate !== undefined
    ? normalizeOptionalDate(input.selectedDate)
    : existingTask.selectedDate ?? null;
  const nextEndMode = input.endMode ?? existingTask.endMode;
  const nextEndDate = input.endDate !== undefined
    ? normalizeOptionalDate(input.endDate)
    : existingTask.endDate ?? null;

  const payload: Partial<TaskDocument> = {
    title: nextTitle,
    notes: input.notes !== undefined ? normalizeOptionalText(input.notes) : existingTask.notes ?? null,
    selectedDate: nextSelectedDate,
    recurrenceType: nextRecurrenceType,
    recurrenceConfig: normalizeRecurrenceConfig(nextRecurrenceType, input.recurrenceConfig ?? existingTask.recurrenceConfig),
    endMode: nextEndMode,
    endDate: nextEndDate,
    status: input.status ?? existingTask.status,
    updatedAt: nowIso(),
  };

  await tasksCollection(context.familyId).doc(taskId).set(payload, { merge: true });
  return {
    ...existingTask,
    ...payload,
  } as TaskDocument;
}

export async function updateTaskInstanceForUser(userId: string, taskId: string, dateKey: string, input: UpdateTaskInstanceInput) {
  assertDateKey(dateKey);
  const context = await resolveTaskContext(userId);
  const task = await resolveTaskById(context, taskId);
  assertTaskWriteAccess(task, context.userId);

  if (!isTaskDueOnDate(task, dateKey)) {
    throw new TaskAccessError('Für diesen Termin gibt es keine aktive Aufgabeninstanz.', 400);
  }

  const overrideId = `${taskId}__${dateKey}`;
  const overrideRef = taskOverridesCollection(context.familyId).doc(overrideId);
  const existingSnapshot = await overrideRef.get();
  const existingOverride = existingSnapshot.exists ? existingSnapshot.data() as TaskOverrideDocument : null;

  const nextTitle = input.title !== undefined
    ? input.title.trim()
    : existingOverride?.title ?? task.title;

  if (!nextTitle) {
    throw new TaskAccessError('Bitte gib einen Titel für die Aufgabe ein.', 400);
  }

  const normalizedTitle = nextTitle === task.title ? null : nextTitle;
  const normalizedNotes = (input.notes !== undefined ? normalizeOptionalText(input.notes) : existingOverride?.notes ?? null) ?? null;
  const persistedNotes = normalizedNotes === (task.notes ?? null) ? null : normalizedNotes;
  const nextStatus = input.status ?? existingOverride?.status ?? task.status;
  const persistedStatus = nextStatus === task.status ? null : nextStatus;

  if (!normalizedTitle && !persistedNotes && !persistedStatus) {
    if (existingSnapshot.exists) {
      await overrideRef.delete();
    }
    return null;
  }

  const timestamp = nowIso();
  const payload: TaskOverrideDocument = {
    id: overrideId,
    taskId,
    familyId: context.familyId,
    date: dateKey,
    title: normalizedTitle,
    notes: persistedNotes,
    status: persistedStatus,
    createdAt: existingOverride?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await overrideRef.set(payload, { merge: true });
  return payload;
}

export async function saveTaskDelegationForUser(userId: string, taskId: string, input: SaveTaskDelegationInput) {
  const context = await resolveTaskContext(userId);
  const task = await resolveTaskById(context, taskId);
  assertTaskWriteAccess(task, context.userId);

  if (!context.partnerUserId) {
    throw new TaskAccessError('Es ist noch kein Partnerkonto mit dieser Familie verknüpft.', 400);
  }

  if (input.mode === 'singleDate' && !input.date) {
    throw new TaskAccessError('Für eine einmalige Delegation wird ein Datum benötigt.', 400);
  }

  if (input.mode === 'recurring' && !input.weekdays?.length) {
    const hasStrategy = input.recurringStrategy === 'always' || input.recurringStrategy === 'alternating';
    if (!hasStrategy) {
      throw new TaskAccessError('Bitte wähle eine Strategie für die regelmäßige Delegation.', 400);
    }
  }

  const normalizedDate = normalizeOptionalDate(input.date);
  if (input.mode === 'recurring' && input.recurringStrategy === 'alternating' && !normalizedDate) {
    throw new TaskAccessError('Für Delegation im Wechsel wird ein Startdatum benötigt.', 400);
  }
  if (input.mode === 'singleDate' && (!normalizedDate || !isTaskDueOnDate(task, normalizedDate))) {
    throw new TaskAccessError('Die Delegation muss auf einen echten Termin dieser Aufgabe gesetzt werden.', 400);
  }

  const delegationId = input.mode === 'singleDate'
    ? `${taskId}__${normalizedDate}`
    : `${taskId}__recurring`;
  const delegationRef = taskDelegationsCollection(context.familyId).doc(delegationId);
  const existingSnapshot = await delegationRef.get();
  const existingDelegation = existingSnapshot.exists ? existingSnapshot.data() as TaskDelegationDocument : null;
  const timestamp = nowIso();

  const payload: TaskDelegationDocument = {
    id: delegationId,
    taskId,
    familyId: context.familyId,
    delegatedByUserId: context.userId,
    delegatedToUserId: context.partnerUserId,
    mode: input.mode,
    date: normalizedDate,
    weekdays: normalizeWeekdays(input.weekdays),
    recurringStrategy: input.recurringStrategy ?? null,
    createdAt: existingDelegation?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await delegationRef.set(payload, { merge: true });

  const systemText = 'Diese Aufgabe wurde dir delegiert.';

  const visibleToUserIds = resolveTaskVisibleToUserIds(task);
  const updatedVisibleToUserIds = [...new Set([...visibleToUserIds, context.partnerUserId])];
  await tasksCollection(context.familyId).doc(task.id).set({
    delegatedToUserId: context.partnerUserId,
    delegatedByUserId: context.userId,
    delegatedAt: timestamp,
    visibilityMode: 'delegated',
    visibleToUserIds: updatedVisibleToUserIds,
    unreadForUserIds: [context.partnerUserId],
    lastMessageAt: timestamp,
    lastMessagePreview: systemText,
    hasConversation: true,
    lastConversationActivityAt: timestamp,
    lastConversationMessageAt: timestamp,
    lastConversationMessageText: systemText,
    lastConversationMessageType: 'system_message',
    lastConversationSenderId: 'system',
    updatedAt: timestamp,
  } satisfies Partial<TaskDocument>, { merge: true });

  const systemResult = await createDelegationSystemMessage({
    familyId: context.familyId,
    taskId: task.id,
    authorUserId: context.userId,
    participantUserIds: updatedVisibleToUserIds,
    responsibilityId: task.responsibilityId ?? null,
    text: systemText,
    idempotencyKey: `${task.id}:${timestamp}:${input.mode}:${normalizedDate ?? 'none'}`,
    meta: {
      delegatedByUserId: context.userId,
      delegatedToUserId: context.partnerUserId,
      delegationMode: input.mode,
      date: normalizedDate,
      weekdays: input.weekdays ?? null,
    },
  });

  await tasksCollection(context.familyId).doc(task.id).set({
    threadId: systemResult.threadId,
  } satisfies Partial<TaskDocument>, { merge: true });

  return payload;
}

export async function delegateTask(userId: string, taskId: string, input: SaveTaskDelegationInput) {
  return saveTaskDelegationForUser(userId, taskId, input);
}

export async function clearTaskDelegationsForUser(userId: string, taskId: string, options?: ClearDelegationOptions) {
  const context = await resolveTaskContext(userId);
  const task = await resolveTaskById(context, taskId);
  assertTaskWriteAccess(task, context.userId);

  if (!options?.mode) {
    const snapshot = await taskDelegationsCollection(context.familyId).where('taskId', '==', taskId).get();
    if (snapshot.empty) return;

    const batch = adminDb.batch();
    snapshot.docs.forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
    return;
  }

  if (options.mode === 'singleDate') {
    const date = normalizeOptionalDate(options.date);
    if (!date) {
      throw new TaskAccessError('Für diese Delegation fehlt das Datum.', 400);
    }

    const delegationRef = taskDelegationsCollection(context.familyId).doc(`${taskId}__${date}`);
    const snapshot = await delegationRef.get();
    if (snapshot.exists) {
      await delegationRef.delete();
    }
    return;
  }

  const recurringRef = taskDelegationsCollection(context.familyId).doc(`${taskId}__recurring`);
  const recurringSnapshot = await recurringRef.get();
  if (recurringSnapshot.exists) {
    await recurringRef.delete();
  }
}


export async function deleteTaskForUser(userId: string, taskId: string) {
  const context = await resolveTaskContext(userId);
  const task = await resolveTaskById(context, taskId);
  assertTaskWriteAccess(task, context.userId);

  const [delegationsSnapshot, overridesSnapshot] = await Promise.all([
    taskDelegationsCollection(context.familyId).where('taskId', '==', taskId).get(),
    taskOverridesCollection(context.familyId).where('taskId', '==', taskId).get(),
  ]);

  const batch = adminDb.batch();
  delegationsSnapshot.docs.forEach((entry) => batch.delete(entry.ref));
  overridesSnapshot.docs.forEach((entry) => batch.delete(entry.ref));
  batch.delete(tasksCollection(context.familyId).doc(taskId));
  await batch.commit();
}
