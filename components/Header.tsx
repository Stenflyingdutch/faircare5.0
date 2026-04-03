'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { appNavigationItems, navigationItems } from '@/utils/navigation';

export function Header() {
  const pathname = usePathname();

  return (
    <header style={{ borderBottom: '1px solid var(--color-line)', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '1rem 0' }}>
        <Link href="/" style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
          mental carefair
        </Link>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem 1rem', fontSize: 14 }}>
          {[...navigationItems, ...appNavigationItems].map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: active ? 600 : 500 }}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
