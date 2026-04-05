export type AdminUserSortField = 'createdAt' | 'email' | 'displayName' | 'updatedAt';
export type AdminUserSortDirection = 'asc' | 'desc';

export interface AdminManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  suspended: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastActivityAt: string | null;
}

export interface AdminActionAuditLog {
  action: 'suspend' | 'unsuspend' | 'delete';
  targetUserId: string;
  targetEmail?: string;
  performedBy: string;
  performedByEmail?: string;
  success: boolean;
  reason?: string;
  createdAt: string;
  details?: Record<string, unknown>;
}
