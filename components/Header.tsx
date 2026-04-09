'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { navigationItems } from '@/utils/navigation';

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
            <span className="brand-fair">Fair</span>
            <span className="brand-care">Care</span>
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
            {navigationItems.map((item) => {
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
