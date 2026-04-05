'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { observeAuthState, signOutUser } from '@/services/auth.service';

const personalNavItems = [
  { label: 'Home', href: '/app/home', tone: 'violet' },
  { label: 'Aufgabengebiete', href: '/app/ownership-dashboard', tone: 'petrol' },
  { label: 'Team-Check', href: '/app/review', tone: 'violet' },
  { label: 'Einstellungen', href: '/app/einstellungen', tone: 'violet' },
] as const;

export function PersonalAreaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setIsReady(true);
    });

    return () => unsubscribe();
  }, [router]);

  async function onLogout() {
    await signOutUser();
    router.push('/login');
  }

  if (!isReady) {
    return (
      <section className="section">
        <div className="container">Lade persönlichen Bereich …</div>
      </section>
    );
  }

  return (
    <section className="section personal-area-section">
      <div className="container personal-area-shell stack">
        <header className="personal-area-header stack">
          <div className="personal-area-headline-row">
            <button type="button" className="button personal-area-logout" onClick={onLogout}>Logout</button>
          </div>
          <nav className="personal-area-nav" aria-label="Hauptnavigation persönlicher Bereich">
            {personalNavItems.map((item) => {
              const isTeamCheckContext = item.href === '/app/review' && pathname.startsWith('/app/ergebnisse');
              const isActive = pathname.startsWith(item.href) || isTeamCheckContext;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`personal-area-nav-link ${isActive ? `active tone-${item.tone}` : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="personal-area-content">{children}</div>
      </div>
    </section>
  );
}
