'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { questionTemplates } from '@/data/questionTemplates';
import { resolveCategoryLabel } from '@/services/resultCalculator';
import {
  buildCategoryComparisons,
} from '@/services/resultInsights';
import { observeAuthState } from '@/services/auth.service';
import {
  ensureUserProfile,
  fetchDashboardBundle,
  fetchAppUserProfile,
  sendPartnerInvitation,
  openSharedResultsView,
  unlockPartnerAndJointResults,
} from '@/services/partnerFlow.service';
import { buildOwnershipRecommendations, computeOwnershipSignals, initializeFamilyOwnership, observeOwnershipCards } from '@/services/ownership.service';
import { getCurrentLocale } from '@/lib/i18n';
import { logSignupError, logSignupInfo } from '@/services/signup-debug.service';
import type { AgeGroup, QuizCategory, StressSelection } from '@/types/quiz';
import type { OwnershipCardDocument, OwnershipRecommendation } from '@/types/ownership';

function sortCategoriesByOwnShareAscending(categories: Array<[QuizCategory, number]>) {
  return [...categories].sort(([, valueA], [, valueB]) => valueA - valueB);
}

function normalizeName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function resolveDisplayName(value?: string | null, fallback = 'Nutzer') {
  return normalizeName(value) || normalizeName(fallback) || 'Nutzer';
}

function resolveFirstName(value?: string | null) {
  const normalized = normalizeName(value);
  if (!normalized) return null;
  const [first] = normalized.split(/\s+/);
  return first || null;
}

function deriveNameFromEmail(email?: string | null) {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return normalizeName(local);
}


function buildNeutralDistributionStatement(selfPercent: number, partnerName: string) {
  if (selfPercent > 55) return 'Aus deiner Sicht liegt aktuell ein größerer Teil der Mental Load bei dir.';
  if (selfPercent < 45) return `Aus deiner Sicht liegt aktuell ein größerer Teil der Mental Load bei ${partnerName}.`;
  return 'Aus deiner Sicht ist die Mental Load aktuell eher gleich verteilt.';
}

function resolvePerceivedStressLabel(stressCategories?: StressSelection[], ageGroup?: AgeGroup) {
  if (!stressCategories || stressCategories.length === 0) return 'In keiner der genannten Bereiche';
  const [topStress] = stressCategories;
  if (!topStress || topStress === 'keiner_genannten_bereiche') return 'In keiner der genannten Bereiche';
  return resolveCategoryLabel(topStress, ageGroup);
}

function buildHighestLoadSummary(categories: Array<[QuizCategory, number]>, ageGroup?: AgeGroup) {
  const maxScore = Math.max(...categories.map(([, value]) => value));
  const highestCategories = categories
    .filter(([, value]) => value === maxScore)
    .map(([category]) => resolveCategoryLabel(category, ageGroup));

  if (highestCategories.length === 1) {
    return `${highestCategories[0]} (${maxScore} %).`;
  }
  if (highestCategories.length === 2) {
    return `${highestCategories[0]} und ${highestCategories[1]} (je ${maxScore} %).`;
  }
  return `Es wurde in mehreren Bereichen eine hohe Belastung gemessen (je ${maxScore} %).`;
}

function formatDiscussedDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
}

function resolveCardIsActive(card: OwnershipCardDocument) {
  return Boolean(card.isActive || card.ownerUserId || card.focusLevel);
}

export function ReviewResultsContent() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePersonalMessage, setInvitePersonalMessage] = useState(
    'Ich habe den FairCare Test gemacht und würde mich freuen, wenn du ihn auch ausfüllst. Danach können wir unsere Ergebnisse gemeinsam anschauen.',
  );
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'success' | 'warning' | 'error'>('idle');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [unlockState, setUnlockState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [unlockMessage, setUnlockMessage] = useState('');
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [unlockBannerIndex, setUnlockBannerIndex] = useState(0);
  const [ownershipInitState, setOwnershipInitState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [ownershipInitMessage, setOwnershipInitMessage] = useState('');
  const [ownershipCards, setOwnershipCards] = useState<OwnershipCardDocument[]>([]);
  const unlockBannerPool = useMemo(
    () => questionTemplates.slice(0, 12).map((entry) => entry.questionText?.de ?? entry.id),
    [],
  );
  const [hasLoggedFirstQuery, setHasLoggedFirstQuery] = useState(false);

  async function refreshDashboard(userId: string) {
    const fresh = await fetchDashboardBundle(userId);
    setBundle(fresh);
    setLoading(false);
  }

  useEffect(() => {
    logSignupInfo('transparenz_page_loaded', {
      step: 'ReviewResultsContent.mount',
      path: '/app/transparenz',
    });
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      logSignupInfo('target_page.load.start', {
        step: 'ReviewResultsContent.observeAuthState',
        path: '/app/transparenz',
        uid: user.uid,
      });
      try {
        setCurrentUserId(user.uid);
        await ensureUserProfile({ userId: user.uid, email: user.email ?? '', displayName: user.displayName ?? undefined });
        if (!hasLoggedFirstQuery) {
          logSignupInfo('transparenz_first_query.start', {
            step: 'ReviewResultsContent.observeAuthState',
            path: '/app/transparenz',
            uid: user.uid,
            extra: {
              queryName: 'fetchDashboardBundle',
              collection: 'users/families/userResults',
            },
          });
        }
        await refreshDashboard(user.uid);
        if (!hasLoggedFirstQuery) {
          logSignupInfo('transparenz_first_query.success', {
            step: 'ReviewResultsContent.observeAuthState',
            path: '/app/transparenz',
            uid: user.uid,
            extra: {
              queryName: 'fetchDashboardBundle',
              collection: 'users/families/userResults',
            },
          });
          setHasLoggedFirstQuery(true);
        }
        logSignupInfo('review_results_loaded', {
          step: 'ReviewResultsContent.observeAuthState',
          path: '/app/transparenz',
          uid: user.uid,
        });
      } catch (error) {
        if (!hasLoggedFirstQuery) {
          logSignupError('transparenz_first_query.failed', error, {
            step: 'ReviewResultsContent.observeAuthState',
            path: '/app/transparenz',
            uid: user.uid,
            extra: {
              queryName: 'fetchDashboardBundle',
              collection: 'users/families/userResults',
            },
          });
        }
        logSignupError('target_page.load.failed', error, {
          step: 'ReviewResultsContent.observeAuthState',
          path: '/app/transparenz',
          uid: user.uid,
        });
      }
    });

    return () => unsubscribe();
  }, [hasLoggedFirstQuery, router]);

  useEffect(() => {
    if (!bundle?.profile?.familyId) return;
    return observeOwnershipCards(bundle.profile.familyId, setOwnershipCards);
  }, [bundle?.profile?.familyId]);

  async function onInviteSubmit(event: FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setInviteState('error');
      setInviteMessage('Bitte gib eine E-Mail-Adresse ein.');
      return;
    }
    if (!emailPattern.test(email)) {
      setInviteState('error');
      setInviteMessage('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setInviteState('loading');
    setInviteMessage('');
    try {
      const result = await sendPartnerInvitation(email, invitePersonalMessage);
      if (result.delivery === 'saved_without_email') {
        setInviteState('warning');
        setInviteMessage('Einladung gespeichert. Es wurde keine echte E-Mail verschickt, weil der Mail-Provider auf noop steht.');
      } else {
        setInviteState('success');
        setInviteMessage(`Einladung an ${result.partnerEmail} versendet.`);
      }
      if (currentUserId) {
        const profile = await fetchAppUserProfile(currentUserId);
        if (profile?.id) {
          await refreshDashboard(profile.id);
        }
      }
    } catch (error) {
      const errorObject = error as { message?: string };
      setInviteState('error');
      setInviteMessage(errorObject?.message || 'Einladung konnte nicht gesendet werden.');
    }
  }

  async function unlockSharedResults() {
    const userId = currentUserId;
    if (!userId) return;
    setUnlockState('loading');
    setUnlockMessage('');
    setUnlockProgress(0);
    setUnlockBannerIndex(0);

    const TOTAL_DURATION_MS = 5000;
    const TICK_MS = 100;
    const startedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(100, Math.round((elapsed / TOTAL_DURATION_MS) * 100));
      setUnlockProgress(nextProgress);
      if (nextProgress >= 100) {
        window.clearInterval(progressTimer);
      }
    }, TICK_MS);

    const bannerTimer = window.setInterval(() => {
      setUnlockBannerIndex((current) => current + 1);
    }, 450);

    try {
      const result = await unlockPartnerAndJointResults(userId);
      await openSharedResultsView(userId);
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, TOTAL_DURATION_MS - (Date.now() - startedAt))));
      setUnlockProgress(100);
      setUnlockState('success');
      setUnlockMessage(
        result.alreadyActive
          ? 'Eure gemeinsamen Ergebnisse sind bereits freigeschaltet.'
          : 'Eure gemeinsamen Ergebnisse sind jetzt verfügbar.',
      );
      await refreshDashboard(userId);
    } catch (error) {
      setUnlockState('error');
      setUnlockMessage(error instanceof Error ? error.message : 'Freischaltung fehlgeschlagen.');
    } finally {
      window.clearInterval(progressTimer);
      window.clearInterval(bannerTimer);
    }
  }

  const resolvedPartnerName = bundle?.profile?.role === 'partner'
    ? bundle?.initiatorDisplayName
    : bundle?.partnerDisplayName;
  const invitationPartnerName = deriveNameFromEmail(bundle?.invitationPartnerEmail);
  const partnerLabel = resolveDisplayName(resolvedPartnerName, invitationPartnerName ?? 'Partner');
  const firstName = resolveFirstName(bundle?.profile?.firstName)
    || resolveFirstName(bundle?.profile?.displayName);
  const personalGreeting = firstName
    ? `Hi ${firstName}, hier ist Deine Bewertung.`
    : 'Hi, hier ist Deine Bewertung.';
  const activeAgeGroup = bundle?.ownResult?.questionSetSnapshot?.[0]?.ageGroup
    ?? bundle?.partnerResult?.questionSetSnapshot?.[0]?.ageGroup
    ?? bundle?.ageGroupForOwnership
    ?? null;
  const ownResultText = useMemo(() => {
    if (!bundle?.ownResult) return null;
    return {
      selfPercent: bundle.ownResult.totalScore,
      statement: buildNeutralDistributionStatement(bundle.ownResult.totalScore, partnerLabel),
      categories: sortCategoriesByOwnShareAscending(
        Object.entries(bundle.ownResult.categoryScores) as Array<[QuizCategory, number]>,
      ),
      perceivedStressLabel: resolvePerceivedStressLabel(bundle.ownResult.stressCategories, activeAgeGroup ?? undefined),
    };
  }, [bundle?.ownResult, partnerLabel, activeAgeGroup]);

  const hasUnlockedResults = Boolean(
    bundle?.family?.resultsUnlocked
      || bundle?.family?.sharedResultsOpened
      || bundle?.family?.status === 'joint_pending'
      || bundle?.family?.status === 'joint_active',
  );
  const canInvitePartner = bundle?.profile?.role !== 'partner'
    && !bundle?.family?.partnerRegistered
    && !hasUnlockedResults;
  const discussedDate = formatDiscussedDate(bundle?.family?.resultsDiscussedAt ?? null);
  const hasActiveOwnershipCards = ownershipCards.some(resolveCardIsActive);

  useEffect(() => {
    if (bundle?.invitationPartnerEmail) {
      setIsInviteDialogOpen(false);
    }
  }, [bundle?.invitationPartnerEmail]);

  const ownershipSignals = useMemo(() => {
    if (!bundle?.ownResult) return [];
    return computeOwnershipSignals({
      categoryScores: bundle.ownResult.categoryScores,
      stressCategories: bundle.ownResult.stressCategories ?? [],
      partnerCategoryScores: bundle.partnerResult?.categoryScores,
    });
  }, [bundle?.ownResult, bundle?.partnerResult]);

  const ownershipRecommendations = useMemo(() => {
    if (!bundle?.ownResult) return [] as OwnershipRecommendation[];
    return buildOwnershipRecommendations({
      categoryScores: bundle.ownResult.categoryScores,
      stressCategories: bundle.ownResult.stressCategories ?? [],
      partnerCategoryScores: bundle.partnerResult?.categoryScores,
    });
  }, [bundle?.ownResult, bundle?.partnerResult]);

  async function startOwnership() {
    if (!bundle?.profile?.familyId || !bundle?.ownResult || !bundle?.ageGroupForOwnership || !currentUserId) return;
    setOwnershipInitState('loading');
    setOwnershipInitMessage('');

    try {
      const selectedCategories = ownershipRecommendations.map((entry) => entry.categoryKey);

      if (!selectedCategories.length) {
        setOwnershipInitState('error');
        setOwnershipInitMessage('Es konnten noch keine Kategorien als Startpunkt abgeleitet werden.');
        return;
      }

      await initializeFamilyOwnership({
        familyId: bundle.profile.familyId,
        ageGroup: bundle.ageGroupForOwnership,
        actorUserId: currentUserId,
        selectedCategories,
        recommendations: ownershipRecommendations,
        allSignals: ownershipSignals,
        locale: getCurrentLocale(),
      });
      const params = new URLSearchParams({
        from: 'recommendation',
        categories: selectedCategories.join(','),
      });
      router.push(`/app/ownership-dashboard?${params.toString()}`);
    } catch (error) {
      setOwnershipInitState('error');
      console.error('ownership-init-failed', error);
      setOwnershipInitMessage('Die Karten konnten gerade nicht geladen oder angelegt werden. Bitte versuche es erneut.');
    } finally {
      setOwnershipInitState((current) => (current === 'error' ? 'error' : 'idle'));
    }
  }

  if (loading) return <section className="section"><div className="container">Lade Dashboard …</div></section>;

  return (
    <section className="section">
      <div className="container stack">
        <article className="card stack">
          <h2 className="card-title">Eigenes Ergebnis</h2>
          <div className="stack" style={{ gap: 8 }}>
            <p className="card-description" style={{ margin: 0, fontWeight: 600 }}>{personalGreeting}</p>
            <p className="helper" style={{ margin: 0 }}>
              Das ist eine subjektive Momentaufnahme. Sie soll Euch als Anregung dienen, miteinander ins Gespräch zu kommen und gemeinsam auf Eure Verteilung zu schauen.
            </p>
            {discussedDate && <p className="helper" style={{ margin: 0 }}>Zuletzt gemeinsam besprochen am {discussedDate}.</p>}
          </div>
          {!ownResultText
            ? <p className="card-description">Noch kein Ergebnis verknüpft.</p>
            : (
              <>
                <ResultBreakdown
                  title={resolveDisplayName(bundle?.profile?.displayName, 'Du')}
                  partnerName={partnerLabel}
                  ageGroup={activeAgeGroup}
                  result={ownResultText}
                />
                <p className="helper" style={{ margin: 0 }}>Diese Auswertung bleibt als Referenz für spätere Team-Checks erhalten.</p>
              </>
            )}
        </article>

        {canInvitePartner && !bundle?.invitationPartnerEmail && (
          <article className="card stack">
            <p className="helper" style={{ margin: 0 }}>
              Um einen guten Startpunkt zu haben, Euch gemeinsam Gedanken darüber zu machen, was für Euch eine faire Verteilung bedeutet, kannst Du Deinen Partner einladen, dieses Quiz aus seiner Sicht auszufüllen.
            </p>
            <button
              type="button"
              className="button secondary"
              style={{ width: 'fit-content' }}
              onClick={() => setIsInviteDialogOpen(true)}
            >
              Deinen Partner einladen
            </button>
            {inviteState === 'success' && <p className="helper">{inviteMessage}</p>}
            {inviteState === 'warning' && <p className="inline-error">{inviteMessage}</p>}
            {inviteState === 'error' && <p className="inline-error">{inviteMessage}</p>}
          </article>
        )}

        {!hasUnlockedResults && (
          <article className="card stack">
            {bundle?.profile?.role !== 'partner' && !bundle?.family?.partnerRegistered ? (
              <>
                <h2 className="card-title">Status</h2>
                <div className="report-block stack">
                  <p className="helper">Partner-Ergebnis wird nach Freischaltung hier ergänzt.</p>
                  {(ownResultText?.categories ?? []).map(([category]) => (
                    <div key={`ghost-${category}`} className="report-block" style={{ opacity: 0.5 }}>
                      <strong>{resolveCategoryLabel(category, activeAgeGroup ?? undefined)}</strong>
                      <div className="result-bar" />
                    </div>
                  ))}
                </div>
              </>
            ) : bundle?.profile?.role === 'partner' ? (
              <>
                <h2 className="card-title">Status</h2>
                <p className="card-description">
                  {bundle?.family?.partnerRegistered
                    ? `${bundle?.initiatorDisplayName ?? 'Der Initiator'} hat eine E-Mail erhalten und kann jetzt euer gemeinsames Ergebnis freischalten.`
                    : 'Warte auf Abschluss der Registrierung.'}
                </p>
              </>
            ) : (
              <>
                <h2 className="card-title">Status</h2>
                <p className="card-description">
                  {bundle?.family?.partnerRegistered
                    ? 'Dein Partner hat das Quiz abgeschlossen. Du kannst die gemeinsamen Ergebnisse jetzt generieren.'
                    : 'Warte auf die Bewertung deines Partners.'}
                </p>
                {bundle?.family?.partnerRegistered && (
                  <button className="button primary" type="button" onClick={unlockSharedResults} disabled={unlockState === 'loading'}>
                    {unlockState === 'loading' ? 'Gemeinsame Ergebnisse werden berechnet …' : 'Gemeinsame Ergebnisse generieren'}
                  </button>
                )}
                {unlockState === 'loading' && (
                  <>
                    <div className="quiz-progress" aria-label="Berechnungsfortschritt">
                      <div className="quiz-progress-bar" style={{ width: `${unlockProgress}%`, transition: 'width 100ms linear' }} />
                    </div>
                    <p className="helper">{unlockProgress}%</p>
                    <div className="card" style={{ overflow: 'hidden' }}>
                      <p className="helper" style={{ marginBottom: 8 }}>Unsichtbare Denkaufgaben sichtbar gemacht</p>
                      <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {Array.from({ length: 4 }).map((_, offset) => unlockBannerPool[(unlockBannerIndex + offset) % unlockBannerPool.length]).join(' - ')}
                      </p>
                    </div>
                  </>
                )}
                {unlockState === 'success' && <p className="helper">{unlockMessage}</p>}
                {unlockState === 'error' && <p className="inline-error">{unlockMessage}</p>}
              </>
            )}
          </article>
        )}

        {bundle?.family?.resultsUnlocked && bundle?.family?.sharedResultsOpened && (
          <JointResultPanel bundle={bundle} ageGroup={activeAgeGroup} />
        )}

        {bundle?.family?.resultsUnlocked
          && bundle?.family?.sharedResultsOpened
          && !bundle?.family?.resultsDiscussedAt
          && !hasActiveOwnershipCards
          && !!ownershipRecommendations.length && (
          <article className="card stack">
            <h2 className="card-title">Arbeitspakete für ausgewählte Kategorien anschauen und zuordnen</h2>
            <p className="card-description">
              Wie entsteht diese Empfehlung? Sie kombiniert Testbelastung, empfundene Belastung und Unterschiede in der Wahrnehmung.
            </p>
            <div className="stack">
              {ownershipRecommendations.slice(0, 2).map((recommendation) => (
                <div key={recommendation.categoryKey} className="report-block stack">
                  <strong>{resolveCategoryLabel(recommendation.categoryKey, activeAgeGroup ?? undefined)}</strong>
                  <p className="helper" style={{ margin: 0 }}>{recommendation.reasonText}</p>
                </div>
              ))}
            </div>
            <div className="stack">
              <button
                type="button"
                className="button primary"
                onClick={() => startOwnership()}
                disabled={ownershipInitState === 'loading'}
              >
                {ownershipInitState === 'loading' ? 'Ownership wird vorbereitet …' : 'Ausgewählte Arbeitspakete anschauen und zuordnen'}
              </button>
              {ownershipInitState === 'error' && <p className="inline-error">{ownershipInitMessage}</p>}
            </div>
          </article>
        )}

        {(bundle?.family?.resultsDiscussedAt || hasActiveOwnershipCards) && (
          <article className="card stack">
            <Link href="/app/ownership-dashboard" className="button" style={{ width: 'fit-content' }}>
              Zu Verantwortungsgebieten
            </Link>
          </article>
        )}
      </div>
      {isInviteDialogOpen && canInvitePartner && !bundle?.invitationPartnerEmail && (
        <div
          className="ownership-modal-backdrop"
          onClick={() => setIsInviteDialogOpen(false)}
          role="presentation"
        >
          <div
            className="card stack ownership-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Partner einladen"
          >
            <div className="ownership-modal-header">
              <h3 className="card-title" style={{ margin: 0 }}>Partner einladen</h3>
              <button type="button" className="ownership-modal-close" onClick={() => setIsInviteDialogOpen(false)}>
                Schließen
              </button>
            </div>
            <form className="stack" onSubmit={onInviteSubmit}>
              <input
                type="email"
                className="input"
                required
                placeholder="E-Mail deines Partners"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                disabled={inviteState === 'loading'}
              />
              <textarea
                className="input"
                rows={5}
                value={invitePersonalMessage}
                onChange={(event) => setInvitePersonalMessage(event.target.value)}
                aria-label="Persönliche Nachricht"
                placeholder="Persönliche Nachricht"
              />
              <button type="submit" className="button primary" disabled={inviteState === 'loading'}>
                {inviteState === 'loading' ? 'Einladung wird versendet …' : 'Partner zum Quiz einladen'}
              </button>
            </form>
            {inviteState === 'success' && <p className="helper">{inviteMessage}</p>}
            {inviteState === 'warning' && <p className="inline-error">{inviteMessage}</p>}
            {inviteState === 'error' && <p className="inline-error">{inviteMessage}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function JointResultPanel({ bundle, ageGroup }: {
  bundle: Awaited<ReturnType<typeof fetchDashboardBundle>>;
  ageGroup?: AgeGroup | null;
}) {
  if (!bundle.initiatorResult || !bundle.partnerResult) return null;

  const ownDisplayName = deriveNameFromEmail(bundle.profile?.email);
  const initiatorFallback = bundle.profile?.role === 'initiator' ? ownDisplayName ?? 'Initiator' : 'Initiator';
  const partnerFallback = bundle.profile?.role === 'partner'
    ? ownDisplayName ?? 'Partner'
    : deriveNameFromEmail(bundle.invitationPartnerEmail) ?? 'Partner';
  const initiatorName = resolveDisplayName(bundle.initiatorDisplayName, initiatorFallback);
  const partnerName = resolveDisplayName(bundle.partnerDisplayName, partnerFallback);

  const initiatorScores = bundle.initiatorResult.categoryScores;
  const partnerScores = bundle.partnerResult.categoryScores;

  const comparisons = buildCategoryComparisons(initiatorScores, partnerScores);
  const highestInitiator = comparisons.reduce((current, entry) => ((initiatorScores[entry.category] ?? 0) > (initiatorScores[current.category] ?? 0) ? entry : current), comparisons[0]);
  const highestPartner = comparisons.reduce((current, entry) => ((partnerScores[entry.category] ?? 0) > (partnerScores[current.category] ?? 0) ? entry : current), comparisons[0]);
  const sharedHighestCategory = highestInitiator.category === highestPartner.category;

  return (
    <article className="card stack">
      <h2 className="card-title">Gemeinsames Vergleichsergebnis</h2>
      <div className="stack">
        {comparisons.map((entry) => {
          const initiatorSelf = initiatorScores[entry.category] ?? 0;
          const partnerSeesInitiator = 100 - (partnerScores[entry.category] ?? 0);
          const partnerSelf = partnerScores[entry.category] ?? 0;
          const initiatorSeesPartner = 100 - (initiatorScores[entry.category] ?? 0);

          const gapInitiator = Math.abs(initiatorSelf - partnerSeesInitiator);
          const gapPartner = Math.abs(partnerSelf - initiatorSeesPartner);
          const hasGap = gapInitiator >= 12 || gapPartner >= 12;

          return (
            <div className="report-block" key={`cmp-${entry.category}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <strong>{resolveCategoryLabel(entry.category, ageGroup ?? undefined)}</strong>
                <span className="helper" style={{ border: '1px solid currentColor', padding: '2px 8px', borderRadius: 999 }}>
                  {hasGap ? 'Abweichung sichtbar' : 'Stimmig'}
                </span>
              </div>
              <p className="helper" style={{ marginTop: 4 }}>
                {hasGap
                  ? 'Hier gibt es eine größere Abweichung zwischen Selbst- und Fremdwahrnehmung.'
                  : 'Hier stimmen Fremd- und Selbstbild weitgehend überein.'}
              </p>
              <p className="helper" style={{ marginBottom: 4 }}>{initiatorName} selbst</p>
              <div className="result-bar"><div className="result-bar-me" style={{ width: `${initiatorSelf}%` }} /></div>
              <p className="helper" style={{ marginTop: 2 }}>{initiatorSelf}%</p>

              <p className="helper" style={{ marginBottom: 4 }}>{partnerName} sieht {initiatorName}</p>
              <div className="result-bar"><div className="result-bar-me" style={{ width: `${partnerSeesInitiator}%`, opacity: 0.8 }} /></div>
              <p className="helper" style={{ marginTop: 2 }}>{partnerSeesInitiator}%</p>

              <p className="helper" style={{ marginBottom: 4 }}>{partnerName} selbst</p>
              <div className="result-bar"><div className="result-bar-me" style={{ width: `${partnerSelf}%` }} /></div>
              <p className="helper" style={{ marginTop: 2 }}>{partnerSelf}%</p>

              <p className="helper" style={{ marginBottom: 4 }}>{initiatorName} sieht {partnerName}</p>
              <div className="result-bar"><div className="result-bar-me" style={{ width: `${initiatorSeesPartner}%`, opacity: 0.8 }} /></div>
              <p className="helper" style={{ marginTop: 2 }}>{initiatorSeesPartner}%</p>

            </div>
          );
        })}
        <div className="report-block">
          <strong>Größte wahrgenommene Belastung</strong>
          <p className="helper" style={{ margin: '8px 0 0' }}>
            {sharedHighestCategory
              ? `${initiatorName} und ${partnerName} spüren die größte Belastung bei ${resolveCategoryLabel(highestInitiator.category, ageGroup ?? undefined)}.`
              : `${initiatorName} spürt die größte Belastung bei ${resolveCategoryLabel(highestInitiator.category, ageGroup ?? undefined)}, ${partnerName} bei ${resolveCategoryLabel(highestPartner.category, ageGroup ?? undefined)}.`}
          </p>
        </div>
      </div>
    </article>
  );
}

function ResultBreakdown({
  title,
  partnerName,
  result,
  ageGroup,
}: {
  title: string;
  partnerName: string;
  ageGroup?: AgeGroup | null;
  result: {
    selfPercent: number;
    statement: string;
    categories: Array<[QuizCategory, number]>;
    perceivedStressLabel: string;
  };
}) {
  const displayName = resolveDisplayName(title, 'Nicole');
  const sortedCategories = [...result.categories].sort((a, b) => b[1] - a[1]);
  const highestLoad = Math.max(...result.categories.map(([, value]) => value));
  const highestLoadSummary = buildHighestLoadSummary(result.categories, ageGroup ?? undefined);
  const hasNoCategoryAboveHalf = highestLoad < 50;

  return (
    <>
      <p className="helper" style={{ margin: 0 }}>{result.statement}</p>
      <div className="personal-result-summary detailed individual-result-panel individual-result-light">
        <div className="result-overview-grid">
          <div className="result-donut-wrap">
            <div
              className="result-donut"
              style={{ background: `conic-gradient(#7d74e8 0 ${result.selfPercent}%, #d9d8e4 ${result.selfPercent}% 100%)` }}
            >
              <div className="result-donut-inner">
                <strong>{result.selfPercent}%</strong>
                <span>{displayName}</span>
              </div>
            </div>
            <p className="helper"><strong>Gesamtanteil</strong></p>
          </div>
          <div className="result-highlight-grid">
            {hasNoCategoryAboveHalf ? (
              <div className="helper" style={{ margin: 0, lineHeight: 1.55, fontSize: '1rem' }}>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Wichtig:</strong> Unter 50 % heißt <strong>nicht</strong>, dass du zu wenig zur Familie beiträgst.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  Es zeigt nur einen kleinen Ausschnitt: die <strong>„Dran-Denken“-Aufgaben</strong> bei der Erziehung.
                </p>
              </div>
            ) : (
              <div className="helper" style={{ margin: 0, lineHeight: 1.55, fontSize: '1rem' }}>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Bereich mit der höchsten Mental-Load-Bewertung:</strong> {highestLoadSummary}
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Größte empfundene Belastung:</strong> {result.perceivedStressLabel}.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="result-legend">
          <span><i className="dot self" />{displayName}</span>
          <span><i className="dot partner" />{partnerName}</span>
        </div>
      </div>
      <div className="stack category-list individual-result-categories">
        {sortedCategories.map(([category, value]) => (
          <div key={category} className="category-progress-row">
            <strong>{resolveCategoryLabel(category, ageGroup ?? undefined)}</strong>
            <div className="category-progress-track">
              <div className="category-progress-self" style={{ width: `${value}%` }} />
              <div className="category-progress-partner" style={{ width: `${100 - value}%` }} />
            </div>
            <strong className="category-value">{value}%</strong>
          </div>
        ))}
      </div>
    </>
  );
}
