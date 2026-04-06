'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { questionTemplates } from '@/data/questionTemplates';
import { categoryLabelMap } from '@/services/resultCalculator';
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
import type { QuizCategory, StressSelection } from '@/types/quiz';
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

function resolvePerceivedStressLabel(stressCategories?: StressSelection[]) {
  if (!stressCategories || stressCategories.length === 0) return 'In keiner der genannten Bereiche';
  const [topStress] = stressCategories;
  if (!topStress || topStress === 'keiner_genannten_bereiche') return 'In keiner der genannten Bereiche';
  return categoryLabelMap[topStress];
}

function buildHighestLoadSummary(categories: Array<[QuizCategory, number]>) {
  const maxScore = Math.max(...categories.map(([, value]) => value));
  const highestCategories = categories
    .filter(([, value]) => value === maxScore)
    .map(([category]) => categoryLabelMap[category]);

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

  async function refreshDashboard(userId: string) {
    const fresh = await fetchDashboardBundle(userId);
    setBundle(fresh);
    setLoading(false);
  }

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setCurrentUserId(user.uid);
      await ensureUserProfile({ userId: user.uid, email: user.email ?? '', displayName: user.displayName ?? undefined });
      await refreshDashboard(user.uid);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!bundle?.profile?.familyId) return;
    return observeOwnershipCards(bundle.profile.familyId, setOwnershipCards);
  }, [bundle?.profile?.familyId]);

  async function onInviteSubmit(event: FormEvent) {
    event.preventDefault();
    console.info('[partner-invite] Button geklickt');
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
      console.info('[partner-invite] Request wird ausgelöst', {
        target: 'sendPartnerInvitation',
        hasPersonalMessage: Boolean(invitePersonalMessage?.trim()),
        emailDomain: email.split('@')[1] ?? 'invalid',
      });
      const result = await sendPartnerInvitation(email, invitePersonalMessage);
      if (result.delivery === 'saved_without_email') {
        setInviteState('warning');
        if (result.deliveryReason === 'mail_provider_unavailable') {
          setInviteMessage('Einladung gespeichert. Der E-Mail-Versand ist aktuell nicht verfügbar.');
        } else {
          setInviteMessage('Einladung gespeichert. Es wurde keine echte E-Mail verschickt, weil der Mail-Provider auf noop steht.');
        }
      } else {
        setInviteState('success');
        setInviteMessage(`Einladung an ${result.partnerEmail} versendet.`);
      }
      console.info('[partner-invite] Request erfolgreich', {
        delivery: result.delivery,
        provider: 'provider' in result ? (result.provider ?? 'unknown') : 'unknown',
      });
      if (currentUserId) {
        const profile = await fetchAppUserProfile(currentUserId);
        if (profile?.id) {
          await refreshDashboard(profile.id);
        }
      }
    } catch (error) {
      const errorObject = error as { message?: string; details?: { headline?: string } };
      setInviteState('error');
      setInviteMessage(errorObject?.details?.headline || errorObject?.message || 'Einladung konnte nicht gesendet werden.');
      console.error('[partner-invite] Request fehlgeschlagen', {
        message: errorObject?.message ?? 'unknown error',
        headline: errorObject?.details?.headline ?? null,
      });
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
    || resolveFirstName(bundle?.profile?.displayName)
    || 'Du';
  const ownResultText = useMemo(() => {
    if (!bundle?.ownResult) return null;
    return {
      selfPercent: bundle.ownResult.totalScore,
      statement: buildNeutralDistributionStatement(bundle.ownResult.totalScore, partnerLabel),
      categories: sortCategoriesByOwnShareAscending(
        Object.entries(bundle.ownResult.categoryScores) as Array<[QuizCategory, number]>,
      ),
      perceivedStressLabel: resolvePerceivedStressLabel(bundle.ownResult.stressCategories),
    };
  }, [bundle?.ownResult, partnerLabel]);

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
          <h2 className="card-title">
            {`${firstName}, das hier ist deine persönliche Zusammenfassung:`}
          </h2>
          {discussedDate && <p className="helper" style={{ margin: 0 }}>Zuletzt gemeinsam besprochen am {discussedDate}.</p>}
        </article>

        <article className="card stack">
          <h2 className="card-title">Eigenes Ergebnis</h2>
          {!ownResultText
            ? <p className="card-description">Noch kein Ergebnis verknüpft.</p>
            : (
              <>
                <ResultBreakdown
                  title={resolveDisplayName(bundle?.profile?.displayName, 'Du')}
                  partnerName={partnerLabel}
                  result={ownResultText}
                />
                <p className="helper" style={{ margin: 0 }}>Diese Auswertung bleibt als Referenz für spätere Team-Checks erhalten.</p>
              </>
            )}
        </article>

        {canInvitePartner && (
          <article className="card stack">
            <h2 className="card-title">Partner einladen</h2>
            {!bundle?.invitationPartnerEmail ? (
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
            ) : (
              <p className="card-description">Partner wurde per E-Mail eingeladen. Du wirst benachrichtigt, sobald er/sie das Quiz fertiggestellt hat.</p>
            )}
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
                      <strong>{categoryLabelMap[category]}</strong>
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
          <JointResultPanel bundle={bundle} />
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
                  <strong>{categoryLabelMap[recommendation.categoryKey]}</strong>
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
    </section>
  );
}

function JointResultPanel({ bundle }: {
  bundle: Awaited<ReturnType<typeof fetchDashboardBundle>>;
}) {
  if (!bundle.initiatorResult || !bundle.partnerResult) return null;

  const initiatorName = resolveDisplayName(bundle.initiatorDisplayName, deriveNameFromEmail(bundle.profile?.email) ?? 'Initiator');
  const partnerName = resolveDisplayName(bundle.partnerDisplayName, deriveNameFromEmail(bundle.invitationPartnerEmail) ?? 'Partner');

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
                <strong>{categoryLabelMap[entry.category]}</strong>
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
              ? `${initiatorName} und ${partnerName} spüren die größte Belastung bei ${categoryLabelMap[highestInitiator.category]}.`
              : `${initiatorName} spürt die größte Belastung bei ${categoryLabelMap[highestInitiator.category]}, ${partnerName} bei ${categoryLabelMap[highestPartner.category]}.`}
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
}: {
  title: string;
  partnerName: string;
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
  const highestLoadSummary = buildHighestLoadSummary(result.categories);
  const hasNoCategoryAboveHalf = highestLoad < 50;

  return (
    <>
      <h2 className="card-title">{displayName}, das hier ist deine persönliche Zusammenfassung:</h2>
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
            <strong>{categoryLabelMap[category]}</strong>
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
