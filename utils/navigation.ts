import { siteVisibility } from '@/utils/siteVisibility';

export const navigationItems = [
  { label: 'Start', href: '/' },
  { label: 'Mental Load', href: '/mental-load' },
  ...(siteVisibility.about ? [{ label: 'Über uns', href: '/about' } as const] : []),
  ...(siteVisibility.newsletter ? [{ label: 'Newsletter', href: '/newsletter' } as const] : []),
  { label: 'Login', href: '/login' },
] as const;

export const adminNavigationItem = { label: 'Admin', href: '/admin' } as const;
