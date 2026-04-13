'use client';

import type { TaskThreadDetailResponse, TaskThreadListItem } from '@/types/task-chat';

type ApiErrorPayload = {
  error?: string;
  message?: string;
  errorCode?: string;
};

export class TaskChatApiError extends Error {
  status: number;
  errorCode: string | null;

  constructor(message: string, options: { status: number; errorCode: string | null }) {
    super(message);
    this.status = options.status;
    this.errorCode = options.errorCode;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as T | ApiErrorPayload | null;
  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    const message = errorPayload?.message || errorPayload?.error || 'Aktion konnte nicht ausgeführt werden.';
    throw new TaskChatApiError(message, {
      status: response.status,
      errorCode: errorPayload?.errorCode ?? null,
    });
  }
  return payload as T;
}

export async function fetchTaskThreads(scope: 'inbox' | 'threads') {
  const response = await fetch(`/api/task-threads?scope=${scope === 'inbox' ? 'inbox' : 'all'}`, { credentials: 'same-origin' });
  return parseJson<{ threads: TaskThreadListItem[] }>(response);
}

export async function fetchTaskThreadDetail(threadId: string) {
  const response = await fetch(`/api/task-threads/${threadId}`, { credentials: 'same-origin' });
  return parseJson<TaskThreadDetailResponse>(response);
}

export async function sendTaskMessageByTask(taskId: string, text: string) {
  const response = await fetch(`/api/task-threads/by-task/${taskId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ text }),
  });
  return parseJson<{ threadId: string }>(response);
}

export async function sendTaskMessageInThread(threadId: string, taskId: string, text: string) {
  const response = await fetch(`/api/task-threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ taskId, text }),
  });
  return parseJson<{ threadId: string }>(response);
}

export async function markTaskThreadRead(threadId: string) {
  const response = await fetch(`/api/task-threads/${threadId}/read`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  return parseJson<{ success: true }>(response);
}

export async function markTaskThreadUnread(threadId: string) {
  const response = await fetch(`/api/task-threads/${threadId}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ read: false }),
  });
  return parseJson<{ success: true }>(response);
}

export async function deleteTaskThreadInboxEntry(threadId: string) {
  const response = await fetch(`/api/task-threads/${threadId}/read`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  return parseJson<{ success: true }>(response);
}

export async function fetchExchangeUnreadSummary() {
  const response = await fetch('/api/exchange/unread-summary', { credentials: 'same-origin' });
  return parseJson<{ unreadChatCount: number; unreadCheckInCount: number; total: number }>(response);
}
