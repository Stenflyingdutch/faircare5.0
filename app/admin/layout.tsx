import type { ReactNode } from 'react';

import { AdminAccessGuard } from '@/components/admin/AdminAccessGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAccessGuard>{children}</AdminAccessGuard>;
}
