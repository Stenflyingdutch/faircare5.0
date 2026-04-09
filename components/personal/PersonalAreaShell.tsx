'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { ensureUserProfile, fetchDashboardBundle } from '@/services/partnerFlow.service';
import { logSignupError, logSignupInfo } from '@/services/signup-debug.service';
import { isTeamCheckBadgeVisible } from '@/services/teamCheck.logic';

const personalNavItems = [
  { label: 'Meine', href: '/app/home', tone: 'violet', gatedUntilPartnerCompleted: true },
  { label: 'Unsere', href: '/app/ownership-dashboard', tone: 'petrol', gatedUntilPartnerCompleted: false },
  { label: 'Austausch', href: '/app/review', tone: 'violet', gatedUntilPartnerCompleted: true },
] as const;

const LOCKED_TAB_HINT = 'Dieser Bereich wird sichtbar, sobald dein Partner den Test abgeschlossen hat.';

export function PersonalAreaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showTeamCheckDot, setShowTeamCheckDot] = useState(false);
  const [partnerCompleted, setPartnerCompleted] = useState(false);
  const [hasLoggedFirstQuery, setHasLoggedFirstQuery] = useState(false);

  useEffect(() => {
    logSignupInfo('partner_personal_area.mount', {
      step: 'PersonalAreaShell.mount',
      path: pathname,
      extra: { phase: 'mount' },
    });
    logSignupInfo('personal_area.shell.mount', {
      step: 'PersonalAreaShell.mount',
      path: pathname,
      extra: { phase: 'mount' },
    });
    setLoadError(null);
    const unsubscribe = observeAuthState(async (user) => {
      logSignupInfo('personal_area.shell.auth_state.start', {
        step: 'PersonalAreaShell.observeAuthState',
        path: pathname,
      });
      if (!user) {
        router.replace('/login');
        return;
      }
      logSignupInfo('personal_area.shell.auth_state.ready', {
        step: 'PersonalAreaShell.observeAuthState',
        path: pathname,
        uid: user.uid,
      });
      logSignupInfo('partner_personal_area.auth_ready', {
        step: 'PersonalAreaShell.observeAuthState',
        path: pathname,
        uid: user.uid,
      });
      logSignupInfo('target_page.load.start', {
        step: 'PersonalAreaShell.observeAuthState',
        path: pathname,
        uid: user.uid,
      });
      try {
        await ensureUserProfile({
          userId: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? undefined,
        });
        if (!hasLoggedFirstQuery) {
          logSignupInfo('personal_shell_first_query.start', {
            step: 'PersonalAreaShell.observeAuthState',
            path: pathname,
            uid: user.uid,
            extra: { queryName: 'fetchDashboardBundle', collection: 'users/families/userResults' },
          });
        }
        const bundle = await fetchDashboardBundle(user.uid);
        logSignupInfo('personal_area.shell.family_load.success', {
          step: 'PersonalAreaShell.observeAuthState',
          path: pathname,
          uid: user.uid,
          extra: {
            familyPresent: Boolean(bundle.family),
            partnerLinked: Boolean(bundle.family?.partnerUserId),
          },
        });
        logSignupInfo('personal_area.shell.results_load.success', {
          step: 'PersonalAreaShell.observeAuthState',
          path: pathname,
          uid: user.uid,
          extra: {
            ownResultPresent: Boolean(bundle.ownResult),
            sharedResultsReady: Boolean(bundle.family?.resultsUnlocked && bundle.family?.sharedResultsOpened),
          },
        });
        if (!hasLoggedFirstQuery) {
          logSignupInfo('personal_shell_first_query.success', {
            step: 'PersonalAreaShell.observeAuthState',
            path: pathname,
            uid: user.uid,
            extra: { queryName: 'fetchDashboardBundle', collection: 'users/families/userResults' },
          });
          setHasLoggedFirstQuery(true);
        }
        setShowTeamCheckDot(isTeamCheckBadgeVisible({
          nextCheckInAt: bundle.family?.teamCheckPlan?.nextCheckInAt,
          reminderActiveAt: bundle.family?.teamCheckPlan?.reminderActiveAt,
        }));
        setPartnerCompleted(Boolean(bundle.family?.partnerCompleted));
        setIsReady(true);
        setLoadError(null);
        logSignupInfo('personal_shell_ready', {
          step: 'PersonalAreaShell.observeAuthState',
          path: pathname,
          uid: user.uid,
        });
      } catch (error) {
        if (!hasLoggedFirstQuery) {
          logSignupError('personal_shell_first_query.failed', error, {
            step: 'PersonalAreaShell.observeAuthState',
            path: pathname,
            uid: user.uid,
            extra: { queryName: 'fetchDashboardBundle', collection: 'users/families/userResults' },
          });
        }
        logSignupError('target_page.load.failed', error, {
          step: 'PersonalAreaShell.observeAuthState',
          path: pathname,
          uid: user.uid,
        });
        logSignupError('personal_area.loading_stuck', error, {
          step: 'PersonalAreaShell.observeAuthState',
          path: pathname,
          uid: user.uid,
          extra: {
            authCurrentUserReady: true,
            profileReady: false,
            familyReady: false,
            resultsReady: false,
            partnerLinkageReady: false,
            sharedResultsStateReady: false,
          },
        });
        setLoadError(error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden des persönlichen Bereichs.');
      }
    });

    return () => unsubscribe();
  }, [hasLoggedFirstQuery, pathname, router]);

  if (loadError) {
    return (
      <section className="section">
        <div className="container">
          Persönlicher Bereich konnte nicht geladen werden: {loadError}
        </div>
      </section>
    );
  }

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
  const isSettingsActive = pathname.startsWith('/app/einstellungen');

  return (
    <section className="section personal-area-section">
      <div className="container personal-area-shell stack">
        <Link href="/" className="brand personal-area-brand" aria-label="Zur Startseite von FairCare">
          <span className="brand-fair">Fair</span>
          <span className="brand-care">Care</span>
        </Link>
        <header className="personal-area-header stack">
          <div className="personal-area-nav-row">
            {showNavigation && (
              <>
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
                <Link
                  href="/app/einstellungen"
                  className={`personal-area-settings-link ${isSettingsActive ? 'active' : ''}`}
                  aria-label="Einstellungen"
                >
                  <svg
                    className="personal-area-settings-icon"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="3.25" />
                    <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 1 1-3.6 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 1 1 0-3.6h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.8 1.8 0 1 1 3.6 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1.8 1.8 0 1 1 0 3.6h-.2a1 1 0 0 0-.9.7Z" />
                  </svg>
                </Link>
              </>
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
