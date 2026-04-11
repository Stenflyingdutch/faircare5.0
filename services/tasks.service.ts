'use client';

import type {
  CreateTaskInput,
  SaveTaskDelegationInput,
  TaskDocument,
  TaskOverviewResponse,
  UpdateTaskInput,
  UpdateTaskInstanceInput,
} from '@/types/tasks';

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || 'Aktion konnte nicht ausgeführt werden.');
  }
  return payload as T;
}

export async function fetchTaskOverview(selectedDate: string) {
  const response = await fetch(`/api/tasks/overview?date=${encodeURIComponent(selectedDate)}`, {
    credentials: 'same-origin',
  });
  return parseJson<TaskOverviewResponse>(response);
}

export async function createTask(input: CreateTaskInput) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
  return parseJson<{ task: TaskDocument }>(response);
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
  return parseJson<{ task: TaskDocument }>(response);
}

export async function saveTaskDelegation(taskId: string, input: SaveTaskDelegationInput) {
  const response = await fetch(`/api/tasks/${taskId}/delegation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
  return parseJson<{ success?: true }>(response);
}

export async function clearTaskDelegation(taskId: string, options?: { date?: string | null; mode?: 'recurring' | 'singleDate' }) {
  const params = new URLSearchParams();
  if (options?.mode) {
    params.set('mode', options.mode);
  }
  if (options?.date) {
    params.set('date', options.date);
  }

  const query = params.toString();
  const response = await fetch(`/api/tasks/${taskId}/delegation${query ? `?${query}` : ''}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  return parseJson<{ success: true }>(response);
}

export async function updateTaskInstance(taskId: string, date: string, input: UpdateTaskInstanceInput) {
  const response = await fetch(`/api/tasks/${taskId}/instance?date=${encodeURIComponent(date)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  });
  return parseJson<{ override: unknown | null }>(response);
}
