export type TaskThreadMessageType = 'user_message' | 'system_message';

export type TaskThreadSystemEventType = 'task_delegated' | 'task_redelegated' | 'task_info' | null;

export interface TaskConversationDocument {
  id: string;
  taskId: string;
  familyId: string;
  participantUserIds: string[];
  taskTitleSnapshot: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessageText: string;
  lastMessageType: TaskThreadMessageType;
  lastMessageSenderId: string;
  messageCount: number;
  hasDelegationEvent: boolean;
  isArchived: boolean;
  createdByUserId?: string;
}

export interface TaskThreadDocument extends TaskConversationDocument {
  responsibilityId?: string | null;
  lastMessageUserId: string;
}

export interface TaskThreadMessageDocument {
  id: string;
  taskId: string;
  threadId: string;
  familyId: string;
  type: TaskThreadMessageType;
  systemEventType: TaskThreadSystemEventType;
  text: string;
  senderUserId: string;
  receiverUserId: string | null;
  visibleToUserIds: string[];
  readBy: Record<string, boolean>;
  replyToMessageId: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Legacy aliases used in UI components.
  conversationId?: string;
  authorUserId?: string | null;
  messageType?: 'text' | 'systemDelegation' | 'systemInfo';
  meta?: Record<string, unknown> | null;
}

export interface TaskConversationStateDocument {
  taskId: string;
  conversationId: string;
  familyId: string;
  userId: string;
  isTaskVisible: boolean;
  isDelegatedTaskVisible: boolean;
  hasUnread: boolean;
  unreadCount: number;
  inInbox: boolean;
  inboxReason: 'new_message' | 'delegation' | 'awaiting_reply' | 'system_notice' | null;
  requiresReply: boolean;
  hasTaskBadge: boolean;
  lastIncomingMessageAt: string | null;
  lastOutgoingMessageAt: string | null;
  lastReadAt: string | null;
  lastSeenMessageAt: string | null;
  lastRepliedAt: string | null;
  updatedAt: string;
}

export interface TaskInboxEntryDocument {
  id: string;
  taskId: string;
  conversationId: string;
  familyId: string;
  userId: string;
  isOpen: boolean;
  requiresReply: boolean;
  isUnread: boolean;
  source: 'message' | 'delegation' | 'system';
  titleSnapshot: string;
  lastMessageText: string;
  lastMessageType: TaskThreadMessageType;
  lastMessageSenderId: string;
  lastMessageAt: string;
  updatedAt: string;
}

export interface TaskUiSummaryDocument {
  openInboxCount: number;
  unreadConversationCount: number;
  taskBadgeCount: number;
  lastUpdatedAt: string;
}

export interface TaskThreadListItem extends TaskThreadDocument {
  unreadCount: number;
  taskTitle: string;
}

export interface TaskThreadDetailResponse {
  thread: TaskThreadListItem;
  messages: TaskThreadMessageDocument[];
}

export interface TaskThreadMeta {
  threadId: string;
  taskId: string;
  unreadCount: number;
  hasThread: boolean;
}
