import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getAuthenticatedAdminContext } from '@/lib/admin-auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const context = await getAuthenticatedAdminContext();

  if (!context.user) {
    redirect('/login?redirectTo=/admin');
  }

  if (!context.isAdmin) {
    redirect('/app/einstellungen?error=admin_access_denied');
  }

  return children;
}
