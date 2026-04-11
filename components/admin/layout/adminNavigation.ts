import type { AdminUserRole } from '@/lib/admin/types';

export interface AdminNavigationItem {
  href: string;
  label: string;
  roles?: AdminUserRole[];
}

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/categories', label: 'Kategorien', roles: ['super_admin', 'admin', 'content_admin'] },
  { href: '/admin/questions', label: 'Fragenkatalog', roles: ['super_admin', 'admin', 'content_admin'] },
  { href: '/admin/responsibilities', label: 'Verantwortungsbereiche', roles: ['super_admin', 'admin', 'content_admin'] },
  { href: '/admin/content', label: 'Texte und Header', roles: ['super_admin', 'admin', 'content_admin'] },
  { href: '/admin/emails', label: 'E-Mail-Templates', roles: ['super_admin', 'admin', 'content_admin'] },
  { href: '/admin/users', label: 'Nutzerverwaltung', roles: ['super_admin', 'admin', 'support_admin'] },
  { href: '/admin/translations', label: 'Sprachen', roles: ['super_admin', 'admin', 'content_admin'] },
  { href: '/admin/system', label: 'System', roles: ['super_admin', 'admin'] },
  { href: '/admin/audit', label: 'Änderungsverlauf' },
];
