'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AdminBackToAppButton } from '@/components/admin/layout/AdminBackToAppButton';
import { ADMIN_NAVIGATION } from '@/components/admin/layout/adminNavigation';
import { canAccessAdminModule } from '@/lib/admin/adminPermissions';
import type { AdminUserRole } from '@/lib/admin/types';

interface AdminShellProps {
  children: React.ReactNode;
  role: AdminUserRole;
}

export function AdminShell({ children, role }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>FairCare Admin</h2>
        <nav>
          {ADMIN_NAVIGATION
            .filter((item) => canAccessAdminModule(role, item.roles))
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={`admin-nav-link ${isActive ? 'active' : ''}`}>
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <strong>Administration</strong>
          </div>
          <div className="admin-header-actions">
            <AdminBackToAppButton />
            <Link href="/app/einstellungen" className="admin-user-link">Mein Bereich</Link>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
