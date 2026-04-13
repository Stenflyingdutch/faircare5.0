'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { ensureUserProfile, fetchDashboardBundle } from '@/services/partnerFlow.service';
import { fetchExchangeUnreadSummary } from '@/services/task-chat.service';
import { logSignupError, logSignupInfo } from '@/services/signup-debug.service';

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
  const [partnerCompleted, setPartnerCompleted] = useState(false);
  const [exchangeBadgeCount, setExchangeBadgeCount] = useState(0);
  const [hasLoggedFirstQuery, setHasLoggedFirstQuery] = useState(false);
  const badgePollingRef = useRef<number | null>(null);

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
        logSignupInfo('bootstrap.personal_area.read.start', {
          step: 'PersonalAreaShell.observeAuthState',
          path: pathname,
          uid: user.uid,
        });
        const bundle = await fetchDashboardBundle(user.uid);
        logSignupInfo('bootstrap.personal_area.read.success', {
          step: 'PersonalAreaShell.observeAuthState',
          path: pathname,
          uid: user.uid,
          extra: {
            profilePresent: Boolean(bundle.profile),
            familyId: bundle.profile?.familyId ?? null,
            familyPresent: Boolean(bundle.family),
          },
        });
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
        setPartnerCompleted(Boolean(bundle.family?.partnerCompleted));
        const unreadSummary = await fetchExchangeUnreadSummary().catch(() => null);
        setExchangeBadgeCount(unreadSummary?.unreadChatCount ?? 0);
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
        logSignupError('bootstrap.personal_area.read.failed', error, {
          step: 'PersonalAreaShell.observeAuthState',
          path: pathname,
          uid: user.uid,
        });
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

  useEffect(() => {
    if (!isReady) return;
    if (badgePollingRef.current !== null) {
      window.clearInterval(badgePollingRef.current);
    }
    badgePollingRef.current = window.setInterval(() => {
      void fetchExchangeUnreadSummary()
        .then((summary) => setExchangeBadgeCount(summary.unreadChatCount))
        .catch(() => {});
    }, 12000);
    return () => {
      if (badgePollingRef.current !== null) {
        window.clearInterval(badgePollingRef.current);
      }
    };
  }, [isReady]);

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
                        {item.href === '/app/review' && exchangeBadgeCount > 0 && <span className="ios-badge exchange-nav-badge" aria-label={`${exchangeBadgeCount} neue Einträge`}>{exchangeBadgeCount > 99 ? '99+' : exchangeBadgeCount}</span>}
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
                    viewBox="0 0 16 16"
                    width="18"
                    height="18"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.27-.7-2.7.73-2 2l.17.31a1.464 1.464 0 0 1-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.7 1.27.73 2.7 2 2l.31-.17a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.27.7 2.7-.73 2-2l-.17-.31a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.7-1.27-.73-2.7-2-2l-.31.17a1.464 1.464 0 0 1-2.105-.872z" />
                    <path d="M8 10.5A2.5 2.5 0 1 1 8 5.5a2.5 2.5 0 0 1 0 5z" fill="#ffffff" />
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
