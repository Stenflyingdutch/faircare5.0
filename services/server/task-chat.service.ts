import 'server-only';

import { adminDb } from '@/lib/firebase-admin';
import { familySubcollections, firestoreCollections } from '@/types/domain';
import { canUserSeeTask, resolveTaskVisibleToUserIds } from '@/services/tasks.logic';
import type { TaskDocument, TaskOverviewResponse } from '@/types/tasks';
import type {
  FamilyUserChatDocument,
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

function nowIso() {
  return new Date().toISOString();
}


function logTaskChatDebug(event: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') return;
  console.info(`[task-chat] ${event}`, context);
}

function logTaskChatRead(event: string, context: Record<string, unknown>) {
  logTaskChatDebug(`read.${event}`, context);
}

function logTaskChatWrite(event: string, context: Record<string, unknown>) {
  logTaskChatDebug(`write.${event}`, context);
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

async function ensureFamilyUserDoc(params: {
  familyId: string;
  userId: string;
  source: string;
  roleHint?: FamilyUserChatDocument['role'];
}) {
  const { familyId, userId, source, roleHint } = params;
  const userRef = familyUsersCollection(familyId).doc(userId);
  const userSnapshot = await userRef.get();
  if (userSnapshot.exists) {
    logTaskChatRead('familyUser.parent', {
      familyId,
      userId,
      source,
      parentExists: true,
      parentCreated: false,
    });
    return { existed: true };
  }

  const familyRef = adminDb.collection(firestoreCollections.families).doc(familyId);
  const familySnapshot = await familyRef.get();
  if (!familySnapshot.exists) {
    throw new TaskChatAccessError('Familie konnte nicht geladen werden.', 404);
  }

  const family = familySnapshot.data() as { initiatorUserId?: string; partnerUserId?: string | null };
  const role = roleHint
    ?? (family.initiatorUserId === userId ? 'initiator' : (family.partnerUserId === userId ? 'partner' : null));
  const timestamp = nowIso();
  const payload: FamilyUserChatDocument = {
    id: userId,
    userId,
    familyId,
    role,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await userRef.set(payload, { merge: true });
  logTaskChatWrite('familyUser.parent', {
    familyId,
    userId,
    source,
    parentExists: false,
    parentCreated: true,
    role,
    path: `families/${familyId}/users/${userId}`,
  });
  return { existed: false };
}

export async function ensureFamilyChatUserDocs(params: {
  familyId: string;
  userIds: string[];
  source: string;
}) {
  const uniqueIds = uniqueUserIds(params.userIds);
  await Promise.all(uniqueIds.map((userId) => ensureFamilyUserDoc({
    familyId: params.familyId,
    userId,
    source: `${params.source}:${userId}`,
  })));
}

async function resolveTaskOrThrow(familyId: string, taskId: string) {
  const snapshot = await tasksCollection(familyId).doc(taskId).get();
  if (!snapshot.exists) {
    throw new TaskChatAccessError('Aufgabe nicht gefunden.', 404);
  }
  return { ...(snapshot.data() as TaskDocument), id: snapshot.id } as TaskDocument;
}

function uniqueUserIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((value): value is string => Boolean(value && value.trim())))];
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

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value && typeof value === 'object') {
    const maybe = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
    if (typeof maybe.toDate === 'function') {
      const date = maybe.toDate();
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    if (typeof maybe.seconds === 'number') {
      const date = new Date((maybe.seconds * 1000) + Math.floor((maybe.nanoseconds ?? 0) / 1_000_000));
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  }
  return null;
}

function toSafeRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    if (!key) return acc;
    if (entry === undefined) return acc;
    if (entry === null || typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      acc[key] = entry;
      return acc;
    }
    const iso = toIsoTimestamp(entry);
    if (iso) {
      acc[key] = iso;
      return acc;
    }
    if (Array.isArray(entry)) {
      acc[key] = entry.map((item) => (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' || item === null ? item : String(item)));
      return acc;
    }
    acc[key] = String(entry);
    return acc;
  }, {});
}

function normalizeChatThread(
  raw: unknown,
  docId: string,
  context: { familyId: string; currentUserId: string; tab: 'inbox' | 'threads' },
): TaskThreadListItem | null {
  if (!raw || typeof raw !== 'object') {
    logTaskChatRead('threads.normalize.skip', { ...context, docId, reason: 'not-an-object' });
    return null;
  }
  const source = raw as Partial<TaskConversationDocument> & Record<string, unknown>;
  const taskId = typeof source.taskId === 'string' && source.taskId.trim() ? source.taskId : docId;
  const familyId = typeof source.familyId === 'string' && source.familyId.trim() ? source.familyId : context.familyId;
  const participantsRaw = Array.isArray(source.participantUserIds) ? source.participantUserIds : [];
  const participantUserIds = uniqueUserIds(participantsRaw.map((value) => (typeof value === 'string' ? value : null)));
  if (!taskId || !participantUserIds.length) {
    logTaskChatRead('threads.normalize.skip', {
      ...context,
      docId,
      reason: !taskId ? 'missing-task-id' : 'missing-participants',
      participantCount: participantUserIds.length,
    });
    return null;
  }

  const updatedAt = toIsoTimestamp(source.updatedAt) ?? toIsoTimestamp(source.lastMessageAt) ?? nowIso();
  const createdAt = toIsoTimestamp(source.createdAt) ?? updatedAt;
  const lastMessageAt = toIsoTimestamp(source.lastMessageAt) ?? updatedAt;
  const lastMessageText = typeof source.lastMessageText === 'string' ? source.lastMessageText : '';
  const lastMessageType = source.lastMessageType === 'system_message' ? 'system_message' : 'user_message';
  const lastMessageSenderId = typeof source.lastMessageSenderId === 'string' && source.lastMessageSenderId.trim()
    ? source.lastMessageSenderId
    : (typeof source.createdByUserId === 'string' && source.createdByUserId.trim() ? source.createdByUserId : context.currentUserId);
  const createdByUserId = typeof source.createdByUserId === 'string' && source.createdByUserId.trim()
    ? source.createdByUserId
    : lastMessageSenderId;

  const normalized: TaskThreadListItem = {
    id: typeof source.id === 'string' && source.id.trim() ? source.id : docId,
    taskId,
    familyId,
    participantUserIds,
    taskTitleSnapshot: typeof source.taskTitleSnapshot === 'string' && source.taskTitleSnapshot.trim()
      ? source.taskTitleSnapshot
      : 'Aufgabe',
    createdAt,
    updatedAt,
    lastMessageAt,
    lastMessageText,
    lastMessageType,
    lastMessageSenderId,
    messageCount: typeof source.messageCount === 'number' ? source.messageCount : 0,
    hasDelegationEvent: Boolean(source.hasDelegationEvent),
    isArchived: Boolean(source.isArchived),
    createdByUserId,
    unreadCount: 0,
    taskTitle: typeof source.taskTitleSnapshot === 'string' && source.taskTitleSnapshot.trim()
      ? source.taskTitleSnapshot
      : 'Aufgabe',
    responsibilityId: null,
    lastMessageUserId: lastMessageSenderId,
  };

  return normalized;
}

function normalizeChatMessage(raw: unknown, docId: string, context: { familyId: string; currentUserId: string; threadId: string }): TaskThreadMessageDocument | null {
  if (!raw || typeof raw !== 'object') {
    logTaskChatRead('messages.normalize.skip', { ...context, docId, reason: 'not-an-object' });
    return null;
  }
  const source = raw as Partial<TaskThreadMessageDocument> & Record<string, unknown>;
  const threadId = typeof source.threadId === 'string' && source.threadId.trim() ? source.threadId : context.threadId;
  const taskId = typeof source.taskId === 'string' && source.taskId.trim() ? source.taskId : context.threadId;
  const createdAt = toIsoTimestamp(source.createdAt) ?? nowIso();
  const updatedAt = toIsoTimestamp(source.updatedAt) ?? createdAt;
  const senderUserId = typeof source.senderUserId === 'string' && source.senderUserId.trim() ? source.senderUserId : 'system';

  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id : docId,
    taskId,
    threadId,
    familyId: typeof source.familyId === 'string' && source.familyId.trim() ? source.familyId : context.familyId,
    type: source.type === 'system_message' ? 'system_message' : 'user_message',
    systemEventType: source.systemEventType === 'task_delegated' || source.systemEventType === 'task_redelegated' || source.systemEventType === 'task_info'
      ? source.systemEventType
      : null,
    text: typeof source.text === 'string' ? source.text : '',
    senderUserId,
    receiverUserId: typeof source.receiverUserId === 'string' && source.receiverUserId.trim() ? source.receiverUserId : null,
    visibleToUserIds: Array.isArray(source.visibleToUserIds) ? source.visibleToUserIds.filter((value): value is string => typeof value === 'string') : [],
    readBy: toSafeRecord(source.readBy) as Record<string, boolean> ?? {},
    replyToMessageId: typeof source.replyToMessageId === 'string' ? source.replyToMessageId : null,
    metadata: toSafeRecord(source.metadata),
    createdAt,
    updatedAt,
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

async function recomputeUiSummary(familyId: string, userId: string) {
  await ensureFamilyUserDoc({ familyId, userId, source: 'recomputeUiSummary' });
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
  logTaskChatWrite('thread.upsert.start', params);
  const threadRef = taskThreadsCollection(params.familyId).doc(params.taskId);
  const snapshot = await threadRef.get();
  if (snapshot.exists) {
    logTaskChatDebug('createOrGetThread.success', { ...params, existed: true, threadId: params.taskId });
    return snapshot.data() as TaskConversationDocument;
  }

  const task = await resolveTaskOrThrow(params.familyId, params.taskId);
  const participantUserIds = uniqueUserIds([
    ...resolveTaskVisibleToUserIds(task),
    ...params.participantUserIds,
    params.actorUserId,
  ]);
  const timestamp = nowIso();
  const payload: TaskConversationDocument = {
    id: params.taskId,
    taskId: params.taskId,
    familyId: params.familyId,
    participantUserIds,
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
  logTaskChatWrite('thread.upsert.success', { ...params, existed: false, threadId: params.taskId, participantUserIds });
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
  logTaskChatWrite('message.send.start', { familyId: params.familyId, taskId: params.taskId, authorUserId: params.authorUserId, messageType: params.messageType ?? 'user_message' });
  if (!messageText) {
    throw new TaskChatAccessError('Bitte gib eine Nachricht ein.', 400);
  }

  const task = await resolveTaskOrThrow(params.familyId, params.taskId);
  if (!canUserSeeTask(task, params.authorUserId)) {
    throw new TaskChatAccessError('Kein Zugriff auf diese Aufgabe.', 403);
  }

  const visibleParticipants = uniqueUserIds([
    ...resolveTaskVisibleToUserIds(task),
    ...params.participantUserIds,
    params.authorUserId,
  ]);

  const receiverUserId = resolveReceiverUserId(visibleParticipants, params.authorUserId);
  await ensureFamilyUserDoc({ familyId: params.familyId, userId: params.authorUserId, source: 'sendTaskMessage.author' });
  if (receiverUserId) {
    await ensureFamilyUserDoc({ familyId: params.familyId, userId: receiverUserId, source: 'sendTaskMessage.receiver' });
  }
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
      logTaskChatWrite('inboxEntry.upsert', {
        familyId: params.familyId,
        taskId: params.taskId,
        userId: receiverUserId,
        source: params.source ?? (params.systemEventType === 'task_delegated' ? 'delegation' : 'message'),
        visibleToUserIds: visibleParticipants,
      });
      transaction.set(inboxEntriesCollection(params.familyId, receiverUserId).doc(params.taskId), {
        ...(receiverInboxSnap?.exists ? receiverInboxSnap.data() as TaskInboxEntryDocument : {}),
        ...receiverInbox,
      }, { merge: true });
    }

    logTaskChatWrite('message.send.transaction', {
      familyId: params.familyId,
      taskId: params.taskId,
      messageId: messageRef.id,
      participantUserIds: visibleParticipants,
      visibleToUserIds: visibleParticipants,
      senderUserId: messagePayload.senderUserId,
      receiverUserId,
      receiverConversationStatePath: receiverUserId ? `families/${params.familyId}/users/${receiverUserId}/conversationStates/${params.taskId}` : null,
      receiverInboxEntryPath: receiverUserId ? `families/${params.familyId}/users/${receiverUserId}/inboxEntries/${params.taskId}` : null,
      senderConversationStatePath: `families/${params.familyId}/users/${params.authorUserId}/conversationStates/${params.taskId}`,
      senderInboxEntryPath: `families/${params.familyId}/users/${params.authorUserId}/inboxEntries/${params.taskId}`,
    });
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
  logTaskChatWrite('message.send.finish', { familyId: params.familyId, taskId: params.taskId, authorUserId: params.authorUserId, receiverUserId, messageId: messagePayload.id });
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
  logTaskChatRead(params.inboxOnly ? 'threads.inbox.start' : 'threads.all.start', params);
  const scope = params.inboxOnly ? 'inbox' : 'threads';
  try {
    await ensureFamilyUserDoc({ familyId: params.familyId, userId: params.userId, source: params.inboxOnly ? 'readThreadList.inbox' : 'readThreadList.threads' });
    if (params.inboxOnly) {
    let inboxSnapshot;
    let inboxUsedFallbackSort = false;
    try {
      console.log('[task-chat][debug] firestore-read', {
        scope,
        familyId: params.familyId,
        userId: params.userId,
        collection: `families/${params.familyId}/users/${params.userId}/inboxEntries`,
        docCount: null,
      });
      inboxSnapshot = await inboxEntriesCollection(params.familyId, params.userId)
        .where('isOpen', '==', true)
        .orderBy('lastMessageAt', 'desc')
        .get();
      console.log('[task-chat][debug] firestore-read', {
        scope,
        familyId: params.familyId,
        userId: params.userId,
        collection: `families/${params.familyId}/users/${params.userId}/inboxEntries`,
        docCount: inboxSnapshot.docs.length,
      });
    } catch (error) {
      if (resolveFirestoreErrorCode(error) === 'failed-precondition') {
        inboxUsedFallbackSort = true;
        logTaskChatRead('threads.inbox.queryFallback', {
          familyId: params.familyId,
          currentUserId: params.userId,
          reason: 'missing-composite-index-lastMessageAt',
        });
        console.log('[task-chat][debug] firestore-read', {
          scope,
          familyId: params.familyId,
          userId: params.userId,
          collection: `families/${params.familyId}/users/${params.userId}/inboxEntries`,
          docCount: null,
        });
        inboxSnapshot = await inboxEntriesCollection(params.familyId, params.userId)
          .where('isOpen', '==', true)
          .get();
        console.log('[task-chat][debug] firestore-read', {
          scope,
          familyId: params.familyId,
          userId: params.userId,
          collection: `families/${params.familyId}/users/${params.userId}/inboxEntries`,
          docCount: inboxSnapshot.docs.length,
        });
      } else {
        throw error;
      }
    }

    const inboxByThreadId = new Map<string, TaskInboxEntryDocument>();
    inboxSnapshot.docs.forEach((entry) => {
      const payload = entry.data() as TaskInboxEntryDocument;
      const threadId = typeof payload?.conversationId === 'string' && payload.conversationId.trim()
        ? payload.conversationId
        : entry.id;
      inboxByThreadId.set(threadId, payload);
    });

    const threadIds = inboxSnapshot.docs
      .map((entry) => {
        const payload = entry.data() as TaskInboxEntryDocument;
        if (typeof payload?.conversationId === 'string' && payload.conversationId.trim()) return payload.conversationId;
        return entry.id;
      })
      .filter((threadId, index, list) => Boolean(threadId) && list.indexOf(threadId) === index);
    console.log('[task-chat][debug] firestore-read', {
      scope,
      familyId: params.familyId,
      userId: params.userId,
      collection: `families/${params.familyId}/taskThreads`,
      docCount: null,
    });
    const conversations = await Promise.all(threadIds.map((threadId) => taskThreadsCollection(params.familyId).doc(threadId).get()));
    console.log('[task-chat][debug] firestore-read', {
      scope,
      familyId: params.familyId,
      userId: params.userId,
      collection: `families/${params.familyId}/taskThreads`,
      docCount: conversations.length,
    });
    const rows = conversations
      .filter((snap) => snap.exists)
      .map((snap) => {
        const conversation = normalizeChatThread(snap.data(), snap.id, {
          familyId: params.familyId,
          currentUserId: params.userId,
          tab: 'inbox',
        });
        if (!conversation) return null;
        if (!conversation.participantUserIds.includes(params.userId)) {
          logTaskChatRead('threads.inbox.skip', {
            familyId: params.familyId,
            currentUserId: params.userId,
            taskId: conversation.taskId,
            reason: 'thread-not-visible-for-user',
            participantUserIds: conversation.participantUserIds,
          });
          return null;
        }
        const inbox = inboxByThreadId.get(snap.id);
        return {
          ...conversation,
          unreadCount: inbox?.isUnread ? 1 : 0,
        } satisfies TaskThreadListItem;
      })
      .filter((row): row is TaskThreadListItem => Boolean(row))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

    logTaskChatRead('threads.inbox.query', {
      familyId: params.familyId,
      currentUserId: params.userId,
      path: `families/${params.familyId}/users/${params.userId}/inboxEntries`,
      filters: [{ field: 'isOpen', op: '==', value: true }],
      orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
      usedFallbackSort: inboxUsedFallbackSort,
      resultCountRaw: inboxSnapshot.docs.length,
      resultCountNormalized: rows.length,
    });
      return rows;
    }

  let snapshot;
  try {
    console.log('[task-chat][debug] firestore-read', {
      scope,
      familyId: params.familyId,
      userId: params.userId,
      collection: `families/${params.familyId}/taskThreads`,
      docCount: null,
    });
    snapshot = await taskThreadsCollection(params.familyId)
      .where('participantUserIds', 'array-contains', params.userId)
      .orderBy('lastMessageAt', 'desc')
      .get();
    console.log('[task-chat][debug] firestore-read', {
      scope,
      familyId: params.familyId,
      userId: params.userId,
      collection: `families/${params.familyId}/taskThreads`,
      docCount: snapshot.docs.length,
    });
  } catch (error) {
    if (resolveFirestoreErrorCode(error) === 'failed-precondition') {
      logTaskChatRead('threads.all.queryFallback', {
        familyId: params.familyId,
        currentUserId: params.userId,
        reason: 'missing-composite-index-lastMessageAt',
      });
      console.log('[task-chat][debug] firestore-read', {
        scope,
        familyId: params.familyId,
        userId: params.userId,
        collection: `families/${params.familyId}/taskThreads`,
        docCount: null,
      });
      snapshot = await taskThreadsCollection(params.familyId)
        .where('participantUserIds', 'array-contains', params.userId)
        .get();
      console.log('[task-chat][debug] firestore-read', {
        scope,
        familyId: params.familyId,
        userId: params.userId,
        collection: `families/${params.familyId}/taskThreads`,
        docCount: snapshot.docs.length,
      });
    } else {
      throw error;
    }
  }

  console.log('[task-chat][debug] firestore-read', {
    scope,
    familyId: params.familyId,
    userId: params.userId,
    collection: `families/${params.familyId}/users/${params.userId}/conversationStates`,
    docCount: null,
  });
  const stateSnapshot = await conversationStatesCollection(params.familyId, params.userId).get();
  console.log('[task-chat][debug] firestore-read', {
    scope,
    familyId: params.familyId,
    userId: params.userId,
    collection: `families/${params.familyId}/users/${params.userId}/conversationStates`,
    docCount: stateSnapshot.docs.length,
  });
  const unreadByTaskId = new Map<string, number>();
  stateSnapshot.docs.forEach((entry) => {
    const state = entry.data() as TaskConversationStateDocument;
    unreadByTaskId.set(entry.id, state.unreadCount ?? 0);
  });

  const rows = snapshot.docs
    .map((entry) => {
      const conversation = normalizeChatThread(entry.data(), entry.id, {
        familyId: params.familyId,
        currentUserId: params.userId,
        tab: 'threads',
      });
      if (!conversation) return null;
      return {
        ...conversation,
        unreadCount: unreadByTaskId.get(conversation.taskId) ?? 0,
      } satisfies TaskThreadListItem;
    })
    .filter((row): row is TaskThreadListItem => Boolean(row))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  logTaskChatRead('threads.all.query', {
    familyId: params.familyId,
    currentUserId: params.userId,
    path: `families/${params.familyId}/taskThreads`,
    filters: [{ field: 'participantUserIds', op: 'array-contains', value: params.userId }],
    orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
    resultCountRaw: snapshot.docs.length,
    resultCountNormalized: rows.length,
  });
    return rows;
  } catch (error) {
    logTaskChatRead('threads.error', {
      familyId: params.familyId,
      currentUserId: params.userId,
      inboxOnly: params.inboxOnly,
      errorCode: resolveFirestoreErrorCode(error) ?? 'unknown',
      errorMessage: resolveFirestoreErrorMessage(error),
      stack: error instanceof Error ? error.stack : null,
    });
    throw error;
  }
}

export async function getInboxThreads(params: { userId: string; familyId: string }) {
  return readThreadList({ ...params, inboxOnly: true });
}

export async function getAllTaskThreads(params: { userId: string; familyId: string }) {
  return readThreadList({ ...params, inboxOnly: false });
}

export async function markTaskThreadAsRead(params: { familyId: string; threadId: string; userId: string }) {
  logTaskChatDebug('markConversationRead.start', params);
  await ensureFamilyUserDoc({ familyId: params.familyId, userId: params.userId, source: 'markTaskThreadAsRead' });
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

export async function markTaskThreadAsUnread(params: { familyId: string; threadId: string; userId: string }) {
  await ensureFamilyUserDoc({ familyId: params.familyId, userId: params.userId, source: 'markTaskThreadAsUnread' });
  const timestamp = nowIso();
  const stateRef = conversationStatesCollection(params.familyId, params.userId).doc(params.threadId);
  const inboxRef = inboxEntriesCollection(params.familyId, params.userId).doc(params.threadId);

  await adminDb.runTransaction(async (transaction) => {
    const [stateSnap, inboxSnap] = await Promise.all([transaction.get(stateRef), transaction.get(inboxRef)]);

    if (stateSnap.exists) {
      transaction.set(stateRef, {
        hasUnread: true,
        unreadCount: Math.max(1, (stateSnap.data() as TaskConversationStateDocument).unreadCount ?? 0),
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
        hasUnread: true,
        unreadCount: 1,
        inInbox: true,
        inboxReason: 'new_message',
        requiresReply: false,
        hasTaskBadge: true,
        lastIncomingMessageAt: timestamp,
        lastOutgoingMessageAt: null,
        lastReadAt: null,
        lastSeenMessageAt: null,
        lastRepliedAt: null,
        updatedAt: timestamp,
      } satisfies TaskConversationStateDocument, { merge: true });
    }

    if (inboxSnap.exists) {
      transaction.set(inboxRef, {
        isOpen: true,
        isUnread: true,
        updatedAt: timestamp,
      } satisfies Partial<TaskInboxEntryDocument>, { merge: true });
    }
  });

  await recomputeUiSummary(params.familyId, params.userId);
}

export async function removeTaskThreadFromInbox(params: { familyId: string; threadId: string; userId: string }) {
  await ensureFamilyUserDoc({ familyId: params.familyId, userId: params.userId, source: 'removeTaskThreadFromInbox' });
  const timestamp = nowIso();
  const stateRef = conversationStatesCollection(params.familyId, params.userId).doc(params.threadId);
  const inboxRef = inboxEntriesCollection(params.familyId, params.userId).doc(params.threadId);

  await adminDb.runTransaction(async (transaction) => {
    const [stateSnap, inboxSnap] = await Promise.all([transaction.get(stateRef), transaction.get(inboxRef)]);
    if (stateSnap.exists) {
      transaction.set(stateRef, {
        inInbox: false,
        hasTaskBadge: false,
        updatedAt: timestamp,
      } satisfies Partial<TaskConversationStateDocument>, { merge: true });
    }
    if (inboxSnap.exists) {
      const closedState = Boolean(0);
      transaction.set(inboxRef, {
        isOpen: closedState,
        updatedAt: timestamp,
      } satisfies Partial<TaskInboxEntryDocument>, { merge: true });
    }
  });

  await recomputeUiSummary(params.familyId, params.userId);
}

export async function getUnreadChatCount(params: { userId: string; familyId: string }) {
  await ensureFamilyUserDoc({ familyId: params.familyId, userId: params.userId, source: 'getUnreadChatCount' });
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
  logTaskChatRead('messages.start', {
    familyId: params.familyId,
    threadId: params.threadId,
    currentUserId: params.userId,
  });
  try {
    await ensureFamilyUserDoc({ familyId: params.familyId, userId: params.userId, source: 'getThreadDetail' });
    const threadSnapshot = await taskThreadsCollection(params.familyId).doc(params.threadId).get();
  if (!threadSnapshot.exists) {
    throw new TaskChatAccessError('Chat wurde nicht gefunden.', 404);
  }

    const thread = normalizeChatThread(threadSnapshot.data(), threadSnapshot.id, {
      familyId: params.familyId,
      currentUserId: params.userId,
      tab: 'threads',
    });
    if (!thread) {
      throw new TaskChatAccessError('Chat konnte nicht verarbeitet werden.', 500);
    }
    const task = await resolveTaskOrThrow(params.familyId, thread.taskId);
    const participantUserIds = uniqueUserIds([...(thread.participantUserIds ?? []), ...resolveTaskVisibleToUserIds(task)]);
    if (!participantUserIds.includes(params.userId)) {
      throw new TaskChatAccessError('Kein Zugriff auf diesen Chat.', 403);
    }

    if ((thread.participantUserIds ?? []).length !== participantUserIds.length) {
      await taskThreadsCollection(params.familyId).doc(params.threadId).set({
        participantUserIds,
        updatedAt: nowIso(),
      } satisfies Partial<TaskConversationDocument>, { merge: true });
      logTaskChatWrite('thread.participants.backfill', {
        familyId: params.familyId,
        threadId: params.threadId,
        participantUserIds,
      });
    }

    const stateSnapshotPromise = conversationStatesCollection(params.familyId, params.userId).doc(params.threadId).get();
    const messagesSnapshot = await taskMessagesCollection(params.familyId, params.threadId)
      .orderBy('createdAt', 'asc')
      .get();
    const stateSnapshot = await stateSnapshotPromise;

    const unreadCount = stateSnapshot.exists ? ((stateSnapshot.data() as TaskConversationStateDocument).unreadCount ?? 0) : 0;
    const messages = messagesSnapshot.docs
      .map((entry) => normalizeChatMessage(entry.data(), entry.id, { familyId: params.familyId, currentUserId: params.userId, threadId: params.threadId }))
      .filter((message): message is TaskThreadMessageDocument => Boolean(message))
      .filter((message) => {
        if (message.visibleToUserIds.includes(params.userId)) return true;
        if (!message.visibleToUserIds.length) {
          const visibleByLegacyFields = message.senderUserId === params.userId
            || message.receiverUserId === params.userId
            || Object.keys(message.readBy ?? {}).includes(params.userId);
          return visibleByLegacyFields;
        }
        return false;
      })
      .map((message) => toLegacyMessage(message));
    logTaskChatRead('messages.query', {
      familyId: params.familyId,
      taskId: thread.taskId,
      threadId: params.threadId,
      currentUserId: params.userId,
      path: `families/${params.familyId}/taskThreads/${params.threadId}/messages`,
      filters: [],
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
      resultCount: messages.length,
      usedVisibilityFallback: false,
    });

    return {
      thread: toLegacyThreadListItem(thread, thread.taskTitleSnapshot, unreadCount),
      messages,
    };
  } catch (error) {
    logTaskChatRead('messages.error', {
      familyId: params.familyId,
      threadId: params.threadId,
      currentUserId: params.userId,
      errorCode: resolveFirestoreErrorCode(error) ?? 'unknown',
      errorMessage: resolveFirestoreErrorMessage(error),
      stack: error instanceof Error ? error.stack : null,
    });
    throw error;
  }
}

export async function appendThreadMetaToOverview(params: {
  familyId: string;
  userId: string;
  overview: TaskOverviewResponse;
}) {
  await ensureFamilyUserDoc({ familyId: params.familyId, userId: params.userId, source: 'appendThreadMetaToOverview' });
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
