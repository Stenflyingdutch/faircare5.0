import 'server-only';

import { familySubcollections, firestoreCollections } from '@/types/domain';
import { adminDb, verifyAdminSessionCookie } from '@/lib/firebase-admin';
import { assertDateKey } from '@/services/task-date';
import { toTaskOverviewItem } from '@/services/tasks.logic';
import { isSuperuserProfile, resolveAccountStatus } from '@/services/user-profile.service';
import type { AppUserProfile, FamilyDocument } from '@/types/partner-flow';
import type { QuizCategory } from '@/types/quiz';
import type {
  CreateTaskInput,
  SaveTaskDelegationInput,
  TaskDelegationDocument,
  TaskDocument,
  TaskOverviewResponse,
  TaskRecurrenceConfig,
  TaskRecurrenceType,
  TaskWeekday,
  UpdateTaskInput,
} from '@/types/tasks';

type TaskContext = {
  userId: string;
  profile: AppUserProfile;
  family: FamilyDocument;
  familyId: string;
  partnerUserId: string | null;
};

function tasksCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.tasks);
}

function taskDelegationsCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.taskDelegations);
}

function ownershipCardsCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.ownershipCards);
}

function nowIso() {
  return new Date().toISOString();
}

function sortOverviewTasks(left: TaskDocument, right: TaskDocument) {
  const leftWeight = left.recurrenceType === 'none' ? (left.selectedDate ? 0 : 3) : 1;
  const rightWeight = right.recurrenceType === 'none' ? (right.selectedDate ? 0 : 3) : 1;
  if (leftWeight !== rightWeight) return leftWeight - rightWeight;
  if (left.updatedAt !== right.updatedAt) return right.updatedAt.localeCompare(left.updatedAt);
  return left.title.localeCompare(right.title, 'de');
}

function sortDayTasks(left: TaskDocument, right: TaskDocument) {
  if (left.taskType !== right.taskType) {
    return left.taskType === 'dayTask' ? -1 : 1;
  }
  return sortOverviewTasks(left, right);
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
  return snapshot.docs
    .map((entry) => ({ ...(entry.data() as TaskDocument), id: entry.id }))
    .filter((task) => task.status === 'active');
}

async function readFamilyTaskDelegations(familyId: string) {
  const snapshot = await taskDelegationsCollection(familyId).get();
  return snapshot.docs.map((entry) => ({ ...(entry.data() as TaskDelegationDocument), id: entry.id }));
}

function groupDelegationsByTask(delegations: TaskDelegationDocument[]) {
  return delegations.reduce<Map<string, TaskDelegationDocument[]>>((map, delegation) => {
    const bucket = map.get(delegation.taskId) ?? [];
    bucket.push(delegation);
    map.set(delegation.taskId, bucket);
    return map;
  }, new Map());
}

async function resolveTaskById(context: TaskContext, taskId: string) {
  const snapshot = await tasksCollection(context.familyId).doc(taskId).get();
  if (!snapshot.exists) {
    throw new TaskAccessError('Aufgabe nicht gefunden.', 404);
  }
  return { ...(snapshot.data() as TaskDocument), id: snapshot.id };
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

  const [tasks, delegations] = await Promise.all([
    readFamilyTasks(familyId),
    readFamilyTaskDelegations(familyId),
  ]);

  const delegationsByTask = groupDelegationsByTask(delegations);

  return tasks
    .map((task) => toTaskOverviewItem(task, delegationsByTask.get(task.id) ?? [], dateKey))
    .filter((task) => task.isDueOnSelectedDate)
    .sort(sortDayTasks);
}

export async function getTaskOverviewForSelectedDate(userId: string, dateKey: string): Promise<TaskOverviewResponse> {
  const context = await resolveTaskContext(userId);
  const [tasks, delegations, dayTasks] = await Promise.all([
    readFamilyTasks(context.familyId),
    readFamilyTaskDelegations(context.familyId),
    getTasksForSelectedDate(context.familyId, userId, dateKey),
  ]);

  const delegationsByTask = groupDelegationsByTask(delegations);
  const responsibilityTasks = tasks
    .filter((task) => Boolean(task.responsibilityId))
    .sort(sortOverviewTasks)
    .map((task) => toTaskOverviewItem(task, delegationsByTask.get(task.id) ?? [], dateKey));

  return {
    selectedDate: dateKey,
    dayTasks,
    responsibilityTasks,
  };
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
    createdByUserId: context.userId,
    assignedToUserId: context.userId,
    taskType: input.taskType,
    selectedDate,
    recurrenceType,
    recurrenceConfig: normalizeRecurrenceConfig(recurrenceType, input.recurrenceConfig),
    endMode: input.endMode ?? 'never',
    endDate: normalizeOptionalDate(input.endDate),
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await tasksCollection(context.familyId).doc(taskId).set(payload);
  return payload;
}

export async function updateTaskForUser(userId: string, taskId: string, input: UpdateTaskInput) {
  const context = await resolveTaskContext(userId);
  const existingTask = await resolveTaskById(context, taskId);

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

export async function saveTaskDelegationForUser(userId: string, taskId: string, input: SaveTaskDelegationInput) {
  const context = await resolveTaskContext(userId);
  await resolveTaskById(context, taskId);

  if (!context.partnerUserId) {
    throw new TaskAccessError('Es ist noch kein Partnerkonto mit dieser Familie verknüpft.', 400);
  }

  if (input.mode === 'singleDate' && !input.date) {
    throw new TaskAccessError('Für eine einmalige Delegation wird ein Datum benötigt.', 400);
  }

  if (input.mode === 'recurring' && !input.weekdays?.length) {
    throw new TaskAccessError('Bitte wähle mindestens einen Wochentag für die regelmäßige Delegation.', 400);
  }

  const normalizedDate = normalizeOptionalDate(input.date);
  const delegationId = input.mode === 'singleDate'
    ? `${taskId}__${normalizedDate}`
    : `${taskId}__recurring`;
  const timestamp = nowIso();
  const existingSnapshot = await taskDelegationsCollection(context.familyId).where('taskId', '==', taskId).get();

  const payload: TaskDelegationDocument = {
    id: delegationId,
    taskId,
    familyId: context.familyId,
    delegatedByUserId: context.userId,
    delegatedToUserId: context.partnerUserId,
    mode: input.mode,
    date: normalizedDate,
    weekdays: normalizeWeekdays(input.weekdays),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const batch = adminDb.batch();
  existingSnapshot.docs.forEach((entry) => batch.delete(entry.ref));
  batch.set(taskDelegationsCollection(context.familyId).doc(delegationId), payload, { merge: true });
  await batch.commit();
  return payload;
}

export async function clearTaskDelegationsForUser(userId: string, taskId: string) {
  const context = await resolveTaskContext(userId);
  await resolveTaskById(context, taskId);

  const snapshot = await taskDelegationsCollection(context.familyId).where('taskId', '==', taskId).get();
  if (snapshot.empty) return;

  const batch = adminDb.batch();
  snapshot.docs.forEach((entry) => batch.delete(entry.ref));
  await batch.commit();
}
