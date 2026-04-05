import type { AdminManagedUser, AdminUserSortDirection, AdminUserSortField } from '@/services/server/admin/types';

export function normalizeSortField(value?: string | null): AdminUserSortField {
  if (value === 'email' || value === 'displayName' || value === 'updatedAt') return value;
  return 'createdAt';
}

export function normalizeSortDirection(value?: string | null): AdminUserSortDirection {
  return value === 'asc' ? 'asc' : 'desc';
}

export function filterUsersBySearch(users: AdminManagedUser[], search?: string | null) {
  const normalized = search?.trim().toLowerCase();
  if (!normalized) return users;
  return users.filter((entry) =>
    entry.email.toLowerCase().includes(normalized)
    || entry.displayName.toLowerCase().includes(normalized),
  );
}

export function sortUsers(users: AdminManagedUser[], field: AdminUserSortField, direction: AdminUserSortDirection) {
  const sorted = [...users].sort((left, right) => {
    const leftValue = String(left[field] ?? '').toLowerCase();
    const rightValue = String(right[field] ?? '').toLowerCase();
    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
    return 0;
  });

  return direction === 'asc' ? sorted : sorted.reverse();
}
