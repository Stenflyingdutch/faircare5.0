'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import { isTeamCheckBadgeVisible } from '@/services/teamCheck.logic';

const personalNavItems = [
  { label: 'Meine', href: '/app/home', tone: 'violet', gatedUntilPartnerCompleted: true },
  { label: 'Unsere', href: '/app/ownership-dashboard', tone: 'petrol', gatedUntilPartnerCompleted: false },
  { label: 'Austausch', href: '/app/review', tone: 'violet', gatedUntilPartnerCompleted: true },
  { label: 'Transparenz', href: '/app/transparenz', tone: 'petrol', gatedUntilPartnerCompleted: false },
] as const;

const LOCKED_TAB_HINT = 'Dieser Bereich wird sichtbar, sobald dein Partner den Test abgeschlossen hat.';

export function PersonalAreaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [showTeamCheckDot, setShowTeamCheckDot] = useState(false);
  const [partnerCompleted, setPartnerCompleted] = useState(false);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      const bundle = await fetchDashboardBundle(user.uid);
      setShowTeamCheckDot(isTeamCheckBadgeVisible({
        nextCheckInAt: bundle.family?.teamCheckPlan?.nextCheckInAt,
        reminderActiveAt: bundle.family?.teamCheckPlan?.reminderActiveAt,
      }));
      setPartnerCompleted(Boolean(bundle.family?.partnerCompleted));
      setIsReady(true);
    });

    return () => unsubscribe();
  }, [router]);

  if (!isReady) {
    return (
      <section className="section">
        <div className="container">Lade persönlichen Bereich …</div>
      </section>
    );
  }

  const showNavigation = !pathname.startsWith('/app/ergebnisse');
  const activeNavItem = personalNavItems.find((item) => pathname.startsWith(item.href)) ?? null;
  const showLockedPlaceholder = Boolean(activeNavItem?.gatedUntilPartnerCompleted) && !partnerCompleted;

  return (
    <section className="section personal-area-section">
      <div className="container personal-area-shell stack">
        <header className="personal-area-header stack">
          <div className="personal-area-nav-row">
            {showNavigation && (
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
                      {item.href === '/app/review' && showTeamCheckDot && <span className="team-check-nav-dot" aria-hidden="true" />}
                    </Link>
                  );
                })}
              </nav>
            )}
            {showNavigation && (
              <Link
                href="/app/einstellungen"
                className={`personal-area-settings-link ${pathname.startsWith('/app/einstellungen') ? 'active' : ''}`}
                aria-label="Einstellungen öffnen"
              >
                <span aria-hidden="true">⚙</span>
              </Link>
            )}
          </div>
        </header>
        <div className="personal-area-content">
          {showLockedPlaceholder ? (
            <article className="card stack">
              <strong>Noch ein kleiner Schritt</strong>
              <p className="card-description">{LOCKED_TAB_HINT}</p>
            </article>
          ) : children}
        </div>
      </div>
    </section>
  );
}
