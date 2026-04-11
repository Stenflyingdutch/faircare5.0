import type { AdminUserRole } from '@/lib/admin/types';

const roleRank: Record<AdminUserRole, number> = {
  support_admin: 1,
  content_admin: 2,
  admin: 3,
  super_admin: 4,
};

export function resolveAdminRole(profile: { isSuperuser?: boolean; adminRole?: string | null } | null | undefined): AdminUserRole {
  if (profile?.isSuperuser) return 'super_admin';
  if (profile?.adminRole === 'admin') return 'admin';
  return 'support_admin';
}

export function canAccessAdminModule(role: AdminUserRole, allowedRoles?: AdminUserRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) return roleRank[role] >= roleRank.support_admin;
  return allowedRoles.includes(role);
}
