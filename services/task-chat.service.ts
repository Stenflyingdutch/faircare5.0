'use client';

import type { TaskThreadDetailResponse, TaskThreadListItem } from '@/types/task-chat';

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || 'Aktion konnte nicht ausgeführt werden.');
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

export async function fetchExchangeUnreadSummary() {
  const response = await fetch('/api/exchange/unread-summary', { credentials: 'same-origin' });
  return parseJson<{ unreadChatCount: number; unreadCheckInCount: number; total: number }>(response);
}
