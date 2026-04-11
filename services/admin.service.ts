'use client';

import type { UserAccountStatus, UserRole } from '@/types/domain';

export interface AdminUserRecord {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: string | null;
  adminRole: UserRole;
  isSuperuser: boolean;
  accountStatus: UserAccountStatus;
  familyId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  authDisabled: boolean;
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as T | { error?: string; message?: string } | null;
  if (!response.ok) {
    const message = (payload as { error?: string; message?: string } | null)?.error
      || (payload as { error?: string; message?: string } | null)?.message
      || 'Adminaktion fehlgeschlagen.';
    throw new Error(message);
  }
  return payload as T;
}

export async function fetchAdminUsers() {
  const response = await fetch('/api/admin/users', { credentials: 'same-origin' });
  return parseJson<{ users: AdminUserRecord[] }>(response);
}

export async function updateAdminUser(
  userId: string,
  payload: Partial<Pick<AdminUserRecord, 'adminRole' | 'accountStatus' | 'isSuperuser'>>,
) {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  return parseJson<{ user: AdminUserRecord }>(response);
}

export async function deleteAdminUser(userId: string) {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  return parseJson<{ success: true }>(response);
}
