import { auth } from '@/lib/firebase';
import type { AdminManagedUser } from '@/services/server/admin/types';

async function getAuthHeader() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Nicht eingeloggt.');
  }
  return { Authorization: `Bearer ${token}` };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = {
    ...(init?.headers ?? {}),
    ...(await getAuthHeader()),
  };

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Aktion fehlgeschlagen.');
  }

  return payload as T;
}

export async function verifyAdminAccess() {
  return requestJson<{ ok: true }>('/api/admin/me');
}

export async function listUsers(params: { search: string; sortBy: string; sortDirection: string }) {
  const query = new URLSearchParams({
    search: params.search,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });

  const payload = await requestJson<{ users: AdminManagedUser[] }>(`/api/admin/users?${query.toString()}`);
  return payload.users;
}

export async function suspendUser(userId: string) {
  await requestJson(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
}

export async function unsuspendUser(userId: string) {
  await requestJson(`/api/admin/users/${userId}/unsuspend`, { method: 'POST' });
}

export async function deleteUserCascade(userId: string) {
  return requestJson<{ ok: true; result: unknown }>(`/api/admin/users/${userId}`, { method: 'DELETE' });
}
