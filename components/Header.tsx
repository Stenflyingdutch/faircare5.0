'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { appNavigationItems, navigationItems } from '@/utils/navigation';

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-inner">
          <Link href="/" className="brand">
            mental carefair
          </Link>
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Menü öffnen"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
          >
            <span />
          </button>
          <nav id="main-navigation" className={`site-nav ${menuOpen ? 'open' : ''}`}>
            {[...navigationItems, ...appNavigationItems].map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
