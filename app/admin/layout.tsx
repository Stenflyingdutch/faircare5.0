import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/layout/AdminShell';
import { getAuthenticatedAdminContext } from '@/lib/admin-auth';
import { resolveAdminRole } from '@/lib/admin/adminPermissions';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await getAuthenticatedAdminContext();

  if (!context.user) {
    redirect('/login?redirectTo=/admin');
  }

  if (!context.isAdmin) {
    redirect('/app/home');
  }

  const role = resolveAdminRole(context.profile);

  return <AdminShell role={role}>{children}</AdminShell>;
}
