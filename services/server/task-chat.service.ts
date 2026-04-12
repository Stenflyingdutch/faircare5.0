import 'server-only';

import { adminDb } from '@/lib/firebase-admin';
import { familySubcollections, firestoreCollections } from '@/types/domain';
import { canUserSeeTask, resolveTaskVisibleToUserIds } from '@/services/tasks.logic';
import type { TaskDocument, TaskOverviewResponse } from '@/types/tasks';
import type {
  TaskConversationDocument,
  TaskConversationStateDocument,
  TaskInboxEntryDocument,
  TaskThreadDetailResponse,
  TaskThreadListItem,
  TaskThreadMessageDocument,
  TaskThreadMessageType,
  TaskUiSummaryDocument,
} from '@/types/task-chat';

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

function resolveErrorStack(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const maybeStack = (error as { stack?: unknown }).stack;
  return typeof maybeStack === 'string' ? maybeStack : null;
}

function nowIso() {
  return new Date().toISOString();
}


function logTaskChatDebug(event: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[task-chat] ${event}`, context);
}

function taskThreadsCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.taskThreads);
}

function taskMessagesCollection(familyId: string, threadId: string) {
  return taskThreadsCollection(familyId).doc(threadId).collection('messages');
}

function tasksCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.tasks);
}

function familyUsersCollection(familyId: string) {
  return adminDb.collection(firestoreCollections.families).doc(familyId).collection(familySubcollections.users);
}

function conversationStatesCollection(familyId: string, userId: string) {
  return familyUsersCollection(familyId).doc(userId).collection('conversationStates');
}

function inboxEntriesCollection(familyId: string, userId: string) {
  return familyUsersCollection(familyId).doc(userId).collection('inboxEntries');
}

function uiSummaryRef(familyId: string, userId: string) {
  return familyUsersCollection(familyId).doc(userId).collection('uiState').doc('summary');
}

async function resolveTaskOrThrow(familyId: string, taskId: string) {
  const snapshot = await tasksCollection(familyId).doc(taskId).get();
  if (!snapshot.exists) {
    throw new TaskChatAccessError('Aufgabe nicht gefunden.', 404);
  }
  return { ...(snapshot.data() as TaskDocument), id: snapshot.id } as TaskDocument;
}

function toLegacyThreadListItem(
  conversation: TaskConversationDocument,
  taskTitle: string,
  unreadCount: number,
): TaskThreadListItem {
  return {
    ...conversation,
    taskTitle,
    unreadCount,
    responsibilityId: null,
    createdByUserId: conversation.createdByUserId ?? conversation.lastMessageSenderId,
    lastMessageUserId: conversation.lastMessageSenderId,
  };
}

function toLegacyMessage(message: TaskThreadMessageDocument): TaskThreadMessageDocument {
  return {
    ...message,
    threadId: message.threadId,
    authorUserId: message.senderUserId === 'system' ? null : message.senderUserId,
    messageType: message.type === 'user_message'
      ? 'text'
      : (message.systemEventType === 'task_info' ? 'systemInfo' : 'systemDelegation'),
    meta: message.metadata ?? null,
  };
}

function toComparableTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortByLastMessageAtDesc<T extends { lastMessageAt?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => toComparableTime(b.lastMessageAt) - toComparableTime(a.lastMessageAt));
}

function normalizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function toIsoString(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isNaN(parsed) ? null : value.toISOString();
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const dateValue = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
  }
  return null;
}

function normalizeThreadListItem(
  docId: string,
  payload: Partial<TaskConversationDocument> | null | undefined,
  unreadCount: number,
): TaskThreadListItem | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const taskId = normalizeString(payload.taskId, docId);
  const lastMessageAt = toIsoString(payload.lastMessageAt) ?? toIsoString(payload.updatedAt) ?? toIsoString(payload.createdAt) ?? new Date(0).toISOString();
  const taskTitleSnapshot = normalizeString(payload.taskTitleSnapshot, 'Ohne Titel');
  const participantUserIds = normalizeStringArray(payload.participantUserIds);

  return toLegacyThreadListItem({
    id: normalizeString(payload.id, taskId),
    taskId,
    familyId: normalizeString(payload.familyId),
    participantUserIds,
    taskTitleSnapshot,
    createdAt: toIsoString(payload.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(payload.updatedAt) ?? lastMessageAt,
    lastMessageAt,
    lastMessageText: normalizeString(payload.lastMessageText),
    lastMessageType: payload.lastMessageType === 'system_message' ? 'system_message' : 'user_message',
    lastMessageSenderId: normalizeString(payload.lastMessageSenderId, ''),
    messageCount: typeof payload.messageCount === 'number' ? payload.messageCount : 0,
    hasDelegationEvent: Boolean(payload.hasDelegationEvent),
    isArchived: Boolean(payload.isArchived),
    createdByUserId: normalizeString(payload.createdByUserId, normalizeString(payload.lastMessageSenderId, '')),
  }, taskTitleSnapshot, Number.isFinite(unreadCount) ? unreadCount : 0);
}

async function loadInboxSnapshot(familyId: string, userId: string) {
  try {
    logTaskChatDebug('loadInbox.query.start', {
      familyId,
      userId,
      collectionPath: `${firestoreCollections.families}/${familyId}/${familySubcollections.users}/${userId}/inboxEntries`,
      filters: [{ field: 'isOpen', op: '==', value: true }],
      orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
    });
    return await inboxEntriesCollection(familyId, userId)
      .where('isOpen', '==', true)
      .orderBy('lastMessageAt', 'desc')
      .get();
  } catch (error) {
    const code = resolveFirestoreErrorCode(error);
    if (code !== 'failed-precondition') {
      throw error;
    }
    logTaskChatDebug('loadInbox.retryWithoutOrderBy', {
      familyId,
      userId,
      code,
      message: resolveFirestoreErrorMessage(error),
      stack: resolveErrorStack(error),
    });
    return inboxEntriesCollection(familyId, userId)
      .where('isOpen', '==', true)
      .get();
  }
}

async function loadThreadsSnapshot(familyId: string, userId: string) {
  try {
    logTaskChatDebug('loadThreads.query.start', {
      familyId,
      userId,
      collectionPath: `${firestoreCollections.families}/${familyId}/${familySubcollections.taskThreads}`,
      filters: [{ field: 'participantUserIds', op: 'array-contains', value: userId }],
      orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
    });
    return await taskThreadsCollection(familyId)
      .where('participantUserIds', 'array-contains', userId)
      .orderBy('lastMessageAt', 'desc')
      .get();
  } catch (error) {
    const code = resolveFirestoreErrorCode(error);
    if (code !== 'failed-precondition') {
      throw error;
    }
    logTaskChatDebug('loadThreads.retryWithoutOrderBy', {
      familyId,
      userId,
      code,
      message: resolveFirestoreErrorMessage(error),
      stack: resolveErrorStack(error),
    });
    return taskThreadsCollection(familyId)
      .where('participantUserIds', 'array-contains', userId)
      .get();
  }
}

async function recomputeUiSummary(familyId: string, userId: string) {
  const [openInboxSnapshot, unreadStateSnapshot, badgeSnapshot] = await Promise.all([
    inboxEntriesCollection(familyId, userId).where('isOpen', '==', true).get(),
    conversationStatesCollection(familyId, userId).where('hasUnread', '==', true).get(),
    conversationStatesCollection(familyId, userId).where('hasTaskBadge', '==', true).get(),
  ]);

  const summary: TaskUiSummaryDocument = {
    openInboxCount: openInboxSnapshot.size,
    unreadConversationCount: unreadStateSnapshot.size,
    taskBadgeCount: badgeSnapshot.size,
    lastUpdatedAt: nowIso(),
  };

  await uiSummaryRef(familyId, userId).set(summary, { merge: true });
  logTaskChatDebug('badge.recompute', { familyId, userId, summary });
}

function resolveReceiverUserId(participants: string[], senderUserId: string) {
  return participants.find((participantId) => participantId !== senderUserId) ?? null;
}

export async function getOrCreateTaskThread(params: {
  familyId: string;
  taskId: string;
  responsibilityId?: string | null;
  actorUserId: string;
  participantUserIds: string[];
}) {
  logTaskChatDebug('createOrGetThread.start', params);
  const threadRef = taskThreadsCollection(params.familyId).doc(params.taskId);
  const snapshot = await threadRef.get();
  if (snapshot.exists) {
    logTaskChatDebug('createOrGetThread.success', { ...params, existed: true, threadId: params.taskId });
    return snapshot.data() as TaskConversationDocument;
  }

  const task = await resolveTaskOrThrow(params.familyId, params.taskId);
  const timestamp = nowIso();
  const payload: TaskConversationDocument = {
    id: params.taskId,
    taskId: params.taskId,
    familyId: params.familyId,
    participantUserIds: params.participantUserIds,
    taskTitleSnapshot: task.title,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastMessageAt: timestamp,
    lastMessageText: '',
    lastMessageType: 'system_message',
    lastMessageSenderId: params.actorUserId,
    messageCount: 0,
    hasDelegationEvent: false,
    isArchived: false,
    createdByUserId: params.actorUserId,
  };

  await threadRef.set(payload, { merge: true });
  logTaskChatDebug('createOrGetThread.success', { ...params, existed: false, threadId: params.taskId });
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
  systemEventType?: 'task_delegated' | 'task_redelegated' | 'task_info' | null;
  source?: 'message' | 'delegation' | 'system';
  meta?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
}) {
  const messageText = params.text.trim();
  logTaskChatDebug('sendTaskMessage.start', { familyId: params.familyId, taskId: params.taskId, authorUserId: params.authorUserId, messageType: params.messageType ?? 'user_message' });
  if (!messageText) {
    throw new TaskChatAccessError('Bitte gib eine Nachricht ein.', 400);
  }

  const task = await resolveTaskOrThrow(params.familyId, params.taskId);
  if (!canUserSeeTask(task, params.authorUserId)) {
    throw new TaskChatAccessError('Kein Zugriff auf diese Aufgabe.', 403);
  }

  const visibleParticipants = [...new Set([
    ...resolveTaskVisibleToUserIds(task),
    ...params.participantUserIds,
  ])];
  if (!visibleParticipants.includes(params.authorUserId)) {
    visibleParticipants.push(params.authorUserId);
  }

  const receiverUserId = resolveReceiverUserId(visibleParticipants, params.authorUserId);
  if (visibleParticipants.length > 2) {
    logTaskChatDebug('sendTaskMessage.participants.expanded', { taskId: params.taskId, participantCount: visibleParticipants.length, visibleParticipants });
  }
  const conversationRef = taskThreadsCollection(params.familyId).doc(params.taskId);
  logTaskChatDebug('createOrGetThread.start', { familyId: params.familyId, taskId: params.taskId, actorUserId: params.authorUserId });
  const messageRef = params.idempotencyKey
    ? taskMessagesCollection(params.familyId, params.taskId).doc(`system_task_delegated_${params.idempotencyKey}`)
    : taskMessagesCollection(params.familyId, params.taskId).doc();

  const timestamp = nowIso();
  let messagePayload!: TaskThreadMessageDocument;

  let threadExisted = false;
  await adminDb.runTransaction(async (transaction) => {
    const [conversationSnap, messageSnap, receiverStateSnap, senderStateSnap, receiverInboxSnap, senderInboxSnap] = await Promise.all([
      transaction.get(conversationRef),
      transaction.get(messageRef),
      receiverUserId ? transaction.get(conversationStatesCollection(params.familyId, receiverUserId).doc(params.taskId)) : Promise.resolve(null),
      transaction.get(conversationStatesCollection(params.familyId, params.authorUserId).doc(params.taskId)),
      receiverUserId ? transaction.get(inboxEntriesCollection(params.familyId, receiverUserId).doc(params.taskId)) : Promise.resolve(null),
      transaction.get(inboxEntriesCollection(params.familyId, params.authorUserId).doc(params.taskId)),
    ]);

    if (params.idempotencyKey && messageSnap.exists) {
      messagePayload = messageSnap.data() as TaskThreadMessageDocument;
      logTaskChatDebug('sendTaskMessage.duplicateMessageSkipped', { taskId: params.taskId, messageId: messageRef.id, idempotencyKey: params.idempotencyKey });
      return;
    }

    threadExisted = conversationSnap.exists;
    const existingConversation = conversationSnap.exists ? conversationSnap.data() as TaskConversationDocument : null;
    const messageType = params.messageType ?? 'user_message';

    messagePayload = {
      id: messageRef.id,
      taskId: params.taskId,
      threadId: params.taskId,
      conversationId: params.taskId,
      familyId: params.familyId,
      type: messageType,
      systemEventType: params.systemEventType ?? null,
      text: messageText,
      senderUserId: messageType === 'system_message' ? 'system' : params.authorUserId,
      receiverUserId,
      visibleToUserIds: visibleParticipants,
      readBy: visibleParticipants.reduce<Record<string, boolean>>((acc, userId) => {
        acc[userId] = userId === params.authorUserId;
        return acc;
      }, {}),
      replyToMessageId: null,
      metadata: params.meta ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    transaction.set(messageRef, messagePayload, { merge: true });

    const nextConversation: Partial<TaskConversationDocument> = {
      id: params.taskId,
      taskId: params.taskId,
      familyId: params.familyId,
      participantUserIds: visibleParticipants,
      taskTitleSnapshot: task.title,
      createdByUserId: existingConversation?.createdByUserId ?? params.authorUserId,
      createdAt: existingConversation?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastMessageAt: timestamp,
      lastMessageText: messageText,
      lastMessageType: messageType,
      lastMessageSenderId: messagePayload.senderUserId,
      messageCount: (existingConversation?.messageCount ?? 0) + 1,
      hasDelegationEvent: (existingConversation?.hasDelegationEvent ?? false) || params.systemEventType === 'task_delegated',
      isArchived: existingConversation?.isArchived ?? false,
    };

    transaction.set(conversationRef, nextConversation, { merge: true });

    transaction.set(tasksCollection(params.familyId).doc(params.taskId), {
      hasConversation: true,
      visibleToUserIds: visibleParticipants,
      lastConversationActivityAt: timestamp,
      lastConversationMessageAt: timestamp,
      lastConversationMessageText: messageText,
      lastConversationMessageType: messageType,
      lastConversationSenderId: messagePayload.senderUserId,
      threadId: params.taskId,
      lastMessageAt: timestamp,
      lastMessagePreview: messageText,
      unreadForUserIds: receiverUserId ? [receiverUserId] : [],
      updatedAt: timestamp,
    } satisfies Partial<TaskDocument>, { merge: true });

    const senderState: TaskConversationStateDocument = {
      taskId: params.taskId,
      conversationId: params.taskId,
      familyId: params.familyId,
      userId: params.authorUserId,
      isTaskVisible: true,
      isDelegatedTaskVisible: Boolean(task.delegatedToUserId === params.authorUserId),
      hasUnread: false,
      unreadCount: 0,
      inInbox: false,
      inboxReason: null,
      requiresReply: false,
      hasTaskBadge: false,
      lastIncomingMessageAt: senderStateSnap.exists
        ? ((senderStateSnap.data() as TaskConversationStateDocument).lastIncomingMessageAt ?? null)
        : null,
      lastOutgoingMessageAt: timestamp,
      lastReadAt: timestamp,
      lastSeenMessageAt: timestamp,
      lastRepliedAt: timestamp,
      updatedAt: timestamp,
    };

    transaction.set(conversationStatesCollection(params.familyId, params.authorUserId).doc(params.taskId), senderState, { merge: true });

    if (senderInboxSnap.exists) {
      logTaskChatDebug('inboxEntry.closeOnReply', { familyId: params.familyId, taskId: params.taskId, userId: params.authorUserId });
      transaction.set(inboxEntriesCollection(params.familyId, params.authorUserId).doc(params.taskId), {
        isOpen: false,
        isUnread: false,
        requiresReply: false,
        updatedAt: timestamp,
      } satisfies Partial<TaskInboxEntryDocument>, { merge: true });
    }

    if (receiverUserId) {
      const receiverPrevious = receiverStateSnap?.exists
        ? receiverStateSnap.data() as TaskConversationStateDocument
        : null;
      const receiverUnreadCount = (receiverPrevious?.unreadCount ?? 0) + 1;
      const inboxReason: TaskConversationStateDocument['inboxReason'] = params.systemEventType === 'task_delegated'
        ? 'delegation'
        : 'new_message';
      const receiverState: TaskConversationStateDocument = {
        taskId: params.taskId,
        conversationId: params.taskId,
        familyId: params.familyId,
        userId: receiverUserId,
        isTaskVisible: true,
        isDelegatedTaskVisible: task.delegatedToUserId === receiverUserId,
        hasUnread: true,
        unreadCount: receiverUnreadCount,
        inInbox: true,
        inboxReason,
        requiresReply: true,
        hasTaskBadge: true,
        lastIncomingMessageAt: timestamp,
        lastOutgoingMessageAt: receiverPrevious?.lastOutgoingMessageAt ?? null,
        lastReadAt: receiverPrevious?.lastReadAt ?? null,
        lastSeenMessageAt: receiverPrevious?.lastSeenMessageAt ?? null,
        lastRepliedAt: receiverPrevious?.lastRepliedAt ?? null,
        updatedAt: timestamp,
      };
      transaction.set(conversationStatesCollection(params.familyId, receiverUserId).doc(params.taskId), receiverState, { merge: true });

      const receiverInbox: TaskInboxEntryDocument = {
        id: params.taskId,
        taskId: params.taskId,
        conversationId: params.taskId,
        familyId: params.familyId,
        userId: receiverUserId,
        isOpen: true,
        requiresReply: true,
        isUnread: true,
        source: params.source ?? (params.systemEventType === 'task_delegated' ? 'delegation' : 'message'),
        titleSnapshot: task.title,
        lastMessageText: messageText,
        lastMessageType: messageType,
        lastMessageSenderId: messagePayload.senderUserId,
        lastMessageAt: timestamp,
        updatedAt: timestamp,
      };
      logTaskChatDebug('inboxEntry.upsert', { familyId: params.familyId, taskId: params.taskId, userId: receiverUserId, source: params.source ?? (params.systemEventType === 'task_delegated' ? 'delegation' : 'message') });
      transaction.set(inboxEntriesCollection(params.familyId, receiverUserId).doc(params.taskId), {
        ...(receiverInboxSnap?.exists ? receiverInboxSnap.data() as TaskInboxEntryDocument : {}),
        ...receiverInbox,
      }, { merge: true });
    }
  });

  await Promise.all([
    recomputeUiSummary(params.familyId, params.authorUserId),
    receiverUserId ? recomputeUiSummary(params.familyId, receiverUserId) : Promise.resolve(),
  ]);

  logTaskChatDebug('createOrGetThread.success', {
    familyId: params.familyId,
    taskId: params.taskId,
    actorUserId: params.authorUserId,
    threadId: params.taskId,
    existed: threadExisted,
  });
  logTaskChatDebug('sendTaskMessage.finish', { familyId: params.familyId, taskId: params.taskId, authorUserId: params.authorUserId, receiverUserId, messageId: messagePayload.id });
  return { threadId: params.taskId, message: toLegacyMessage(messagePayload) };
}



export async function replyToTaskConversation(params: {
  familyId: string;
  taskId: string;
  authorUserId: string;
  text: string;
  participantUserIds: string[];
  responsibilityId?: string | null;
}) {
  logTaskChatDebug('replyToTaskConversation.start', { familyId: params.familyId, taskId: params.taskId, authorUserId: params.authorUserId });
  const result = await sendTaskMessage(params);
  logTaskChatDebug('replyToTaskConversation.finish', { familyId: params.familyId, taskId: params.taskId, authorUserId: params.authorUserId, threadId: result.threadId });
  return result;
}

export async function markConversationRead(params: { familyId: string; threadId: string; userId: string }) {
  return markTaskThreadAsRead(params);
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
  logTaskChatDebug('delegateTask.start', { familyId: params.familyId, taskId: params.taskId, authorUserId: params.authorUserId });
  const result = await sendTaskMessage({
    ...params,
    messageType: 'system_message',
    systemEventType: 'task_delegated',
    source: 'delegation',
  });
  logTaskChatDebug('delegateTask.finish', { familyId: params.familyId, taskId: params.taskId, authorUserId: params.authorUserId, threadId: result.threadId });
  return result;
}

async function readThreadList(params: { familyId: string; userId: string; inboxOnly: boolean }) {
  logTaskChatDebug(params.inboxOnly ? 'loadInbox.start' : 'loadThreads.start', params);
  if (params.inboxOnly) {
    const inboxSnapshot = await loadInboxSnapshot(params.familyId, params.userId);
    logTaskChatDebug('loadInbox.snapshot.raw', { ...params, inboxEntryCount: inboxSnapshot.size, inboxTaskIds: inboxSnapshot.docs.map((entry) => entry.id) });

    const conversations = await Promise.all(inboxSnapshot.docs.map((entry) => taskThreadsCollection(params.familyId).doc(entry.id).get()));
    logTaskChatDebug('loadInbox.threads.fetched', {
      ...params,
      requestedThreadCount: conversations.length,
      fetchedThreadIds: conversations.map((snap) => snap.id),
      existingThreadIds: conversations.filter((snap) => snap.exists).map((snap) => snap.id),
    });
    const inboxById = new Map(inboxSnapshot.docs.map((entry) => [entry.id, entry.data() as TaskInboxEntryDocument]));
    const rows = sortByLastMessageAtDesc(conversations
      .filter((snap) => snap.exists)
      .map((snap) => {
        const inbox = inboxById.get(snap.id);
        const normalized = normalizeThreadListItem(snap.id, snap.data() as Partial<TaskConversationDocument>, inbox?.isUnread ? 1 : 0);
        if (!normalized) {
          logTaskChatDebug('loadInbox.thread.skipped.invalid', { ...params, threadId: snap.id });
        }
        return normalized;
      })
      .filter((row): row is TaskThreadListItem => Boolean(row)));

    logTaskChatDebug('loadInbox.snapshot', { ...params, size: rows.length });
    return rows;
  }

  const snapshot = await loadThreadsSnapshot(params.familyId, params.userId);

  const stateSnapshot = await conversationStatesCollection(params.familyId, params.userId).get();
  const unreadByTaskId = new Map<string, number>();
  stateSnapshot.docs.forEach((entry) => {
    const state = entry.data() as TaskConversationStateDocument;
    unreadByTaskId.set(entry.id, state.unreadCount ?? 0);
  });

  const rows = sortByLastMessageAtDesc(snapshot.docs.map((entry) => {
    const rawConversation = entry.data() as Partial<TaskConversationDocument>;
    const taskId = normalizeString(rawConversation.taskId, entry.id);
    return normalizeThreadListItem(entry.id, rawConversation, unreadByTaskId.get(taskId) ?? 0);
  }).filter((row): row is TaskThreadListItem => Boolean(row)));
  logTaskChatDebug('loadThreads.snapshot', { ...params, size: rows.length });
  return rows;
}

export async function getInboxThreads(params: { userId: string; familyId: string }) {
  return readThreadList({ ...params, inboxOnly: true });
}

export async function getAllTaskThreads(params: { userId: string; familyId: string }) {
  return readThreadList({ ...params, inboxOnly: false });
}

export async function markTaskThreadAsRead(params: { familyId: string; threadId: string; userId: string }) {
  logTaskChatDebug('markConversationRead.start', params);
  const timestamp = nowIso();
  const stateRef = conversationStatesCollection(params.familyId, params.userId).doc(params.threadId);
  const inboxRef = inboxEntriesCollection(params.familyId, params.userId).doc(params.threadId);

  await adminDb.runTransaction(async (transaction) => {
    const [stateSnap, inboxSnap] = await Promise.all([transaction.get(stateRef), transaction.get(inboxRef)]);

    if (stateSnap.exists) {
      transaction.set(stateRef, {
        hasUnread: false,
        unreadCount: 0,
        lastReadAt: timestamp,
        lastSeenMessageAt: timestamp,
        updatedAt: timestamp,
      } satisfies Partial<TaskConversationStateDocument>, { merge: true });
    } else {
      transaction.set(stateRef, {
        taskId: params.threadId,
        conversationId: params.threadId,
        familyId: params.familyId,
        userId: params.userId,
        isTaskVisible: true,
        isDelegatedTaskVisible: false,
        hasUnread: false,
        unreadCount: 0,
        inInbox: false,
        inboxReason: null,
        requiresReply: false,
        hasTaskBadge: false,
        lastIncomingMessageAt: null,
        lastOutgoingMessageAt: null,
        lastReadAt: timestamp,
        lastSeenMessageAt: timestamp,
        lastRepliedAt: null,
        updatedAt: timestamp,
      } satisfies TaskConversationStateDocument, { merge: true });
    }

    if (inboxSnap.exists) {
      transaction.set(inboxRef, {
        isUnread: false,
        updatedAt: timestamp,
      } satisfies Partial<TaskInboxEntryDocument>, { merge: true });
    }
  });

  await recomputeUiSummary(params.familyId, params.userId);
  logTaskChatDebug('markConversationRead.finish', params);
}

export async function getUnreadChatCount(params: { userId: string; familyId: string }) {
  const summarySnapshot = await uiSummaryRef(params.familyId, params.userId).get();
  if (summarySnapshot.exists) {
    const summary = summarySnapshot.data() as TaskUiSummaryDocument;
    return summary.openInboxCount ?? 0;
  }

  const inboxSnapshot = await inboxEntriesCollection(params.familyId, params.userId)
    .where('isOpen', '==', true)
    .get();
  return inboxSnapshot.size;
}

export async function getThreadDetail(params: { familyId: string; threadId: string; userId: string }): Promise<TaskThreadDetailResponse> {
  const threadSnapshot = await taskThreadsCollection(params.familyId).doc(params.threadId).get();
  if (!threadSnapshot.exists) {
    throw new TaskChatAccessError('Chat wurde nicht gefunden.', 404);
  }

  const thread = threadSnapshot.data() as TaskConversationDocument;
  if (!thread.participantUserIds.includes(params.userId)) {
    throw new TaskChatAccessError('Kein Zugriff auf diesen Chat.', 403);
  }

  const [stateSnapshot, messagesSnapshot] = await Promise.all([
    conversationStatesCollection(params.familyId, params.userId).doc(params.threadId).get(),
    taskMessagesCollection(params.familyId, params.threadId).orderBy('createdAt', 'asc').get(),
  ]);

  const unreadCount = stateSnapshot.exists ? ((stateSnapshot.data() as TaskConversationStateDocument).unreadCount ?? 0) : 0;
  const messages = messagesSnapshot.docs.map((entry) => toLegacyMessage(entry.data() as TaskThreadMessageDocument));
  logTaskChatDebug('loadMessages.snapshot', { ...params, size: messages.length });

  return {
    thread: toLegacyThreadListItem(thread, thread.taskTitleSnapshot, unreadCount),
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

  const [stateSnapshot, inboxSnapshot] = await Promise.all([
    conversationStatesCollection(params.familyId, params.userId).get(),
    inboxEntriesCollection(params.familyId, params.userId).where('isOpen', '==', true).get(),
  ]);

  const stateByTaskId = new Map<string, TaskConversationStateDocument>();
  stateSnapshot.docs.forEach((entry) => {
    stateByTaskId.set(entry.id, entry.data() as TaskConversationStateDocument);
  });

  const openInboxByTaskId = new Map<string, TaskInboxEntryDocument>();
  inboxSnapshot.docs.forEach((entry) => {
    openInboxByTaskId.set(entry.id, entry.data() as TaskInboxEntryDocument);
  });

  const byTaskId = rows.reduce<Record<string, { threadId: string; unreadCount: number; hasThread: true }>>((acc, row) => {
    const state = stateByTaskId.get(row.taskId);
    const hasTaskBadge = state?.hasTaskBadge ?? false;
    acc[row.taskId] = {
      threadId: row.id,
      unreadCount: hasTaskBadge ? 1 : 0,
      hasThread: true,
    };
    return acc;
  }, {});

  const openInboxThreadIds = new Set(openInboxByTaskId.keys());
  const inboxRows = rows.filter((row) => openInboxThreadIds.has(row.taskId));

  return {
    ...baseOverview,
    taskThreadMetaByTaskId: byTaskId,
    taskThreads: rows,
    inbox: inboxRows,
    unreadChatCount: inboxRows.length,
  };
}
