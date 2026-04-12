import 'server-only';

import { adminDb } from '@/lib/firebase-admin';
import { familySubcollections, firestoreCollections } from '@/types/domain';
import { canUserSeeTask, resolveTaskVisibleToUserIds } from '@/services/tasks.logic';
import type { TaskDocument, TaskOverviewResponse } from '@/types/tasks';
import type { TaskThreadDetailResponse, TaskThreadDocument, TaskThreadListItem, TaskThreadMessageDocument, TaskThreadMessageType, TaskThreadReadStateDocument } from '@/types/task-chat';

export class TaskChatAccessError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function resolveFirestoreErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === 'string' ? maybeCode : null;
}

function resolveFirestoreErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error);
  const maybeMessage = (error as { message?: unknown }).message;
  return typeof maybeMessage === 'string' ? maybeMessage : String(error);
}

function nowIso() {
  return new Date().toISOString();
}

function taskThreadsCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.taskThreads);
}

function taskMessagesCollection(familyId: string, threadId: string) {
  return taskThreadsCollection(familyId).doc(threadId).collection('messages');
}

function taskReadStateCollection(familyId: string, threadId: string) {
  return taskThreadsCollection(familyId).doc(threadId).collection('readState');
}

function tasksCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.tasks);
}

async function resolveTaskOrThrow(familyId: string, taskId: string) {
  const snapshot = await tasksCollection(familyId).doc(taskId).get();
  if (!snapshot.exists) {
    throw new TaskChatAccessError('Aufgabe nicht gefunden.', 404);
  }
  return { ...(snapshot.data() as TaskDocument), id: snapshot.id } as TaskDocument;
}

export async function getOrCreateTaskThread(params: {
  familyId: string;
  taskId: string;
  responsibilityId?: string | null;
  actorUserId: string;
  participantUserIds: string[];
}) {
  const threadRef = taskThreadsCollection(params.familyId).doc(params.taskId);
  const snapshot = await threadRef.get();
  const timestamp = nowIso();

  if (snapshot.exists) {
    return snapshot.data() as TaskThreadDocument;
  }

  const payload: TaskThreadDocument = {
    id: params.taskId,
    familyId: params.familyId,
    taskId: params.taskId,
    responsibilityId: params.responsibilityId ?? null,
    createdByUserId: params.actorUserId,
    participantUserIds: params.participantUserIds,
    lastMessageAt: timestamp,
    lastMessageText: '',
    lastMessageUserId: params.actorUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await threadRef.set(payload, { merge: true });
  return payload;
}

export async function sendTaskMessage(params: {
  familyId: string;
  taskId: string;
  authorUserId: string;
  text: string;
  participantUserIds: string[];
  responsibilityId?: string | null;
  messageType?: TaskThreadMessageType;
  meta?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
}) {
  const messageText = params.text.trim();
  if (!messageText) {
    throw new TaskChatAccessError('Bitte gib eine Nachricht ein.', 400);
  }

  const task = await resolveTaskOrThrow(params.familyId, params.taskId);
  if (!canUserSeeTask(task, params.authorUserId)) {
    throw new TaskChatAccessError('Kein Zugriff auf diese Aufgabe.', 403);
  }
  const visibleParticipants = [...new Set(resolveTaskVisibleToUserIds(task))];

  const thread = await getOrCreateTaskThread({
    familyId: params.familyId,
    taskId: params.taskId,
    actorUserId: params.authorUserId,
    participantUserIds: visibleParticipants,
    responsibilityId: params.responsibilityId,
  });

  const messageRef = params.idempotencyKey
    ? taskMessagesCollection(params.familyId, thread.id).doc(`system_task_delegated_${params.idempotencyKey}`)
    : taskMessagesCollection(params.familyId, thread.id).doc();
  const timestamp = nowIso();

  if (params.idempotencyKey) {
    const existing = await messageRef.get();
    if (existing.exists) {
      return { threadId: thread.id, message: existing.data() as TaskThreadMessageDocument };
    }
  }

  const messagePayload: TaskThreadMessageDocument = {
    id: messageRef.id,
    threadId: thread.id,
    authorUserId: params.messageType === 'systemDelegation' ? null : params.authorUserId,
    text: messageText,
    messageType: params.messageType ?? 'text',
    createdAt: timestamp,
    visibleToUserIds: visibleParticipants,
    meta: params.meta ?? null,
  };

  const batch = adminDb.batch();
  batch.set(messageRef, messagePayload);
  batch.set(taskThreadsCollection(params.familyId).doc(thread.id), {
    participantUserIds: visibleParticipants,
    lastMessageAt: timestamp,
    lastMessageText: messageText,
    lastMessageUserId: params.authorUserId,
    updatedAt: timestamp,
  }, { merge: true });

  batch.set(tasksCollection(params.familyId).doc(params.taskId), {
    threadId: thread.id,
    lastMessageAt: timestamp,
    lastMessagePreview: messageText,
    unreadForUserIds: visibleParticipants.filter((id) => id !== params.authorUserId),
    visibleToUserIds: visibleParticipants,
  } satisfies Partial<TaskDocument>, { merge: true });

  for (const participantId of visibleParticipants) {
    const readRef = taskReadStateCollection(params.familyId, thread.id).doc(participantId);
    const readState: TaskThreadReadStateDocument = {
      userId: participantId,
      lastReadAt: participantId === params.authorUserId ? timestamp : '1970-01-01T00:00:00.000Z',
      updatedAt: timestamp,
    };
    batch.set(readRef, readState, { merge: true });
  }

  await batch.commit();
  return { threadId: thread.id, message: messagePayload };
}

export async function createDelegationSystemMessage(params: {
  familyId: string;
  taskId: string;
  authorUserId: string;
  participantUserIds: string[];
  responsibilityId?: string | null;
  text: string;
  idempotencyKey?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  return sendTaskMessage({
    ...params,
    messageType: 'systemDelegation',
    text: params.text,
    idempotencyKey: params.idempotencyKey ?? null,
    meta: params.meta ?? null,
  });
}

async function readThreadList(params: { familyId: string; userId: string; inboxOnly: boolean }) {
  const snapshot = await taskThreadsCollection(params.familyId)
    .where('participantUserIds', 'array-contains', params.userId)
    .orderBy('lastMessageAt', 'desc')
    .get();

  const tasksSnapshot = await tasksCollection(params.familyId)
    .where('visibleToUserIds', 'array-contains', params.userId)
    .get();
  const taskTitleMap = new Map<string, string>();
  tasksSnapshot.docs.forEach((entry) => {
    const task = entry.data() as TaskDocument;
    taskTitleMap.set(entry.id, task.title);
  });

  const rows = await Promise.all(snapshot.docs.map(async (entry) => {
    const thread = entry.data() as TaskThreadDocument;
    const readStateSnapshot = await taskReadStateCollection(params.familyId, thread.id).doc(params.userId).get();
    const readState = readStateSnapshot.exists ? readStateSnapshot.data() as TaskThreadReadStateDocument : null;
    const lastReadAt = readState?.lastReadAt ?? '1970-01-01T00:00:00.000Z';

    const unreadSnapshot = await taskMessagesCollection(params.familyId, thread.id)
      .where('createdAt', '>', lastReadAt)
      .get();

    const unreadCount = unreadSnapshot.docs.reduce((count, messageEntry) => {
      const message = messageEntry.data() as TaskThreadMessageDocument;
      return message.authorUserId === params.userId ? count : count + 1;
    }, 0);
    const row: TaskThreadListItem = {
      ...thread,
      unreadCount,
      taskTitle: taskTitleMap.get(thread.taskId) ?? 'Aufgabe',
    };
    return row;
  }));

  if (!params.inboxOnly) return rows;
  return rows.filter((entry) => entry.unreadCount > 0);
}

export async function getInboxThreads(params: { userId: string; familyId: string }) {
  return readThreadList({ ...params, inboxOnly: true });
}

export async function getAllTaskThreads(params: { userId: string; familyId: string }) {
  return readThreadList({ ...params, inboxOnly: false });
}

export async function markTaskThreadAsRead(params: { familyId: string; threadId: string; userId: string }) {
  const timestamp = nowIso();
  const readState: TaskThreadReadStateDocument = {
    userId: params.userId,
    lastReadAt: timestamp,
    updatedAt: timestamp,
  };
  await taskReadStateCollection(params.familyId, params.threadId).doc(params.userId).set(readState, { merge: true });

  const threadSnapshot = await taskThreadsCollection(params.familyId).doc(params.threadId).get();
  if (threadSnapshot.exists) {
    const thread = threadSnapshot.data() as TaskThreadDocument;
    const task = await resolveTaskOrThrow(params.familyId, thread.taskId);
    const unreadForUserIds = (task.unreadForUserIds ?? []).filter((id) => id !== params.userId);
    await tasksCollection(params.familyId).doc(thread.taskId).set({ unreadForUserIds } satisfies Partial<TaskDocument>, { merge: true });
  }
}

export async function getUnreadChatCount(params: { userId: string; familyId: string }) {
  const threads = await getInboxThreads(params);
  return threads.reduce((sum, item) => sum + item.unreadCount, 0);
}

export async function getThreadDetail(params: { familyId: string; threadId: string; userId: string }): Promise<TaskThreadDetailResponse> {
  const threadSnapshot = await taskThreadsCollection(params.familyId).doc(params.threadId).get();
  if (!threadSnapshot.exists) {
    throw new TaskChatAccessError('Chat wurde nicht gefunden.', 404);
  }

  const thread = threadSnapshot.data() as TaskThreadDocument;
  if (!thread.participantUserIds.includes(params.userId)) {
    throw new TaskChatAccessError('Kein Zugriff auf diesen Chat.', 403);
  }

  const [listRows, messagesSnapshot] = await Promise.all([
    readThreadList({ familyId: params.familyId, userId: params.userId, inboxOnly: false }),
    taskMessagesCollection(params.familyId, params.threadId).orderBy('createdAt', 'asc').get(),
  ]);

  const row = listRows.find((entry) => entry.id === params.threadId);
  const messages = messagesSnapshot.docs.map((entry) => entry.data() as TaskThreadMessageDocument);

  return {
    thread: row ?? { ...thread, unreadCount: 0, taskTitle: 'Aufgabe' },
    messages,
  };
}

export async function appendThreadMetaToOverview(params: {
  familyId: string;
  userId: string;
  overview: TaskOverviewResponse;
}) {
  const baseOverview: TaskOverviewResponse = {
    ...params.overview,
    dayTasks: params.overview.dayTasks ?? [],
    responsibilityTasks: params.overview.responsibilityTasks ?? [],
    tasks: params.overview.dayTasks ?? [],
    responsibilities: params.overview.responsibilityTasks ?? [],
    taskThreads: [],
    inbox: [],
    warnings: params.overview.warnings ?? [],
  };

  let rows: Awaited<ReturnType<typeof getAllTaskThreads>>;
  try {
    rows = await getAllTaskThreads({ familyId: params.familyId, userId: params.userId });
  } catch (error) {
    const code = resolveFirestoreErrorCode(error);
    const message = resolveFirestoreErrorMessage(error);
    const warningContext = {
      endpoint: '/api/tasks/overview',
      userId: params.userId,
      familyId: params.familyId,
      loader: 'taskThreads',
      code: code ?? 'unknown',
      message,
    };

    if (code === 'failed-precondition') {
      console.warn('[home] missing composite index for taskThreads query.', warningContext);
      return {
        ...baseOverview,
        taskThreadMetaByTaskId: {},
        unreadChatCount: 0,
        warnings: [...(baseOverview.warnings ?? []), 'missing composite index'],
      };
    }

    console.warn('[home] optional chat loader failed.', warningContext);
    return {
      ...baseOverview,
      taskThreadMetaByTaskId: {},
      unreadChatCount: 0,
      warnings: [...(baseOverview.warnings ?? []), 'chat loader failed'],
    };
  }
  const byTaskId = rows.reduce<Record<string, { threadId: string; unreadCount: number; hasThread: true }>>((acc, row) => {
    acc[row.taskId] = { threadId: row.id, unreadCount: row.unreadCount, hasThread: true };
    return acc;
  }, {});

  const unreadCount = rows.reduce((sum, row) => sum + row.unreadCount, 0);

  return {
    ...baseOverview,
    taskThreadMetaByTaskId: byTaskId,
    taskThreads: rows,
    inbox: rows.filter((row) => row.unreadCount > 0),
    unreadChatCount: unreadCount,
  };
}
