export type TaskThreadMessageType = 'text' | 'systemDelegation' | 'systemInfo';

export interface TaskThreadDocument {
  id: string;
  familyId: string;
  taskId: string;
  responsibilityId?: string | null;
  createdByUserId: string;
  participantUserIds: string[];
  lastMessageAt: string;
  lastMessageText: string;
  lastMessageUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskThreadMessageDocument {
  id: string;
  threadId: string;
  authorUserId: string;
  text: string;
  messageType: TaskThreadMessageType;
  createdAt: string;
  meta?: Record<string, unknown> | null;
}

export interface TaskThreadReadStateDocument {
  userId: string;
  lastReadAt: string;
  updatedAt: string;
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
