'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { categoryLabelMap } from '@/services/resultCalculator';
import {
  buildCategoryComparisons,
  buildClarityConsistencyInsight,
  buildJointRecommendations,
  buildPerceptionOutcome,
} from '@/services/resultInsights';
import { observeAuthState } from '@/services/auth.service';
import {
  ensureUserProfile,
  fetchDashboardBundle,
  fetchAppUserProfile,
  sendPartnerInvitation,
  unlockPartnerAndJointResults,
} from '@/services/partnerFlow.service';
import type { JointInsight } from '@/types/partner-flow';
import type { QuizCategory } from '@/types/quiz';

function sortCategoriesByOwnShareAscending(categories: Array<[QuizCategory, number]>) {
  return [...categories].sort(([, valueA], [, valueB]) => valueA - valueB);
}

function resolveDisplayName(value?: string | null, fallback = 'Nutzer') {
  return value?.trim() || fallback;
}

function buildNeutralDistributionStatement(selfPercent: number) {
  if (selfPercent > 55) return 'Aus deiner Sicht liegt aktuell ein größerer Teil der Mental Load bei dir.';
  if (selfPercent < 45) return 'Aus deiner Sicht liegt aktuell ein größerer Teil der Mental Load bei deinem Partner.';
  return 'Aus deiner Sicht ist die Mental Load aktuell eher gleich verteilt.';
}

export default function DashboardPage() {
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
      const errorObject = error as { code?: string; message?: string };
      console.error('sendPartnerInvite failed', error);
      console.error('code', errorObject?.code);
      console.error('message', errorObject?.message);
      setInviteState('error');
      setInviteMessage(errorObject?.message || 'Einladung konnte nicht gesendet werden.');
    }
  }

  async function unlockSharedResults() {
    const userId = currentUserId;
    if (!userId) return;
    setUnlockState('loading');
    setUnlockMessage('');
    try {
      const result = await unlockPartnerAndJointResults(userId);
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
    }
  }

  const ownResultText = useMemo(() => {
    if (!bundle?.ownResult) return null;
    const partnerScores = bundle?.profile?.role === 'partner'
      ? bundle?.initiatorResult?.categoryScores
      : bundle?.partnerResult?.categoryScores;
    const partnerName = bundle?.profile?.role === 'partner'
      ? resolveDisplayName(bundle?.initiatorDisplayName, 'Partner')
      : resolveDisplayName(bundle?.partnerDisplayName, 'Partner');
    return {
      selfPercent: bundle.ownResult.totalScore,
      partnerPercent: 100 - bundle.ownResult.totalScore,
      statement: buildNeutralDistributionStatement(bundle.ownResult.totalScore),
      categories: sortCategoriesByOwnShareAscending(
        Object.entries(bundle.ownResult.categoryScores) as Array<[QuizCategory, number]>,
      ),
      partnerCategoryScores: partnerScores,
      partnerName,
    };
  }, [bundle?.ownResult, bundle?.profile?.role, bundle?.initiatorResult?.categoryScores, bundle?.partnerResult?.categoryScores, bundle?.initiatorDisplayName, bundle?.partnerDisplayName]);

  if (loading) return <section className="section"><div className="container">Lade Dashboard …</div></section>;

  return (
    <section className="section">
      <div className="container stack">
        <h1 className="test-title">Dashboard</h1>

        <article className="card stack">
          {!ownResultText
            ? <p className="card-description">Noch kein Ergebnis verknüpft.</p>
            : <ResultBreakdown title={resolveDisplayName(bundle?.profile?.displayName, 'Du')} result={ownResultText} />}
        </article>

        {!bundle?.family?.resultsUnlocked && (
          <article className="card stack">
            {bundle?.profile?.role !== 'partner' && !bundle?.family?.partnerRegistered ? (
              <>
                <h2 className="card-title">Status</h2>
                <p className="card-description">Dein Ergebnis ist bereits da. Lade jetzt deinen Partner ein, damit ihr später auch euer gemeinsames Ergebnis sehen könnt.</p>
                <div className="report-block stack">
                  <p className="helper">Partner-Ergebnis wird nach Freischaltung hier ergänzt.</p>
                  {(ownResultText?.categories ?? []).map(([category]) => (
                    <div key={`ghost-${category}`} className="report-block" style={{ opacity: 0.5 }}>
                      <strong>{categoryLabelMap[category]}</strong>
                      <div className="result-bar" />
                    </div>
                  ))}
                </div>
                <form className="stack" onSubmit={onInviteSubmit}>
                  <input type="email" className="input" required placeholder="E-Mail deines Partners" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} disabled={inviteState === 'loading'} />
                  <textarea className="input" rows={5} value={invitePersonalMessage} onChange={(event) => setInvitePersonalMessage(event.target.value)} aria-label="Persönliche Nachricht" placeholder="Persönliche Nachricht" />
                  <button type="submit" className="button primary" disabled={inviteState === 'loading'}>
                    {inviteState === 'loading' ? 'Einladung wird versendet …' : 'Einladung senden'}
                  </button>
                </form>
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
                    ? 'Dein Partner hat das Quiz abgeschlossen. Du kannst die Ergebnisse jetzt freigeben.'
                    : 'Warte auf die Bewertung deines Partners.'}
                </p>
                {bundle?.family?.partnerRegistered && (
                  <button className="button primary" type="button" onClick={unlockSharedResults} disabled={unlockState === 'loading'}>
                    {unlockState === 'loading' ? 'Freischaltung läuft …' : 'Partner- und Gesamtergebnis freischalten'}
                  </button>
                )}
                {unlockState === 'success' && <p className="helper">{unlockMessage}</p>}
                {unlockState === 'error' && <p className="inline-error">{unlockMessage}</p>}
              </>
            )}
            {inviteState === 'success' && <p className="helper">{inviteMessage}</p>}
            {inviteState === 'warning' && <p className="inline-error">{inviteMessage}</p>}
            {inviteState === 'error' && <p className="inline-error">{inviteMessage}</p>}
          </article>
        )}

        {!bundle?.family?.resultsUnlocked ? (
          <article className="card stack">
            <h2 className="card-title">Status</h2>
            <p className="helper">
              {bundle?.profile?.role === 'partner'
                ? 'Die gemeinsamen Ergebnisse werden sichtbar, sobald der Initiator sie freigegeben hat.'
                : 'Vor der Freischaltung siehst du nur dein eigenes Ergebnis.'}
            </p>
          </article>
        ) : bundle?.family?.sharedResultsOpened ? (
          <JointResultPanel insights={bundle?.joint?.insights ?? []} bundle={bundle} />
        ) : null}
      </div>
    </section>
  );
}

function JointResultPanel({ insights, bundle }: {
  insights: JointInsight[];
  bundle: Awaited<ReturnType<typeof fetchDashboardBundle>>;
}) {
  if (!bundle.initiatorResult || !bundle.partnerResult) return null;
  const ownRole = bundle.profile?.role === 'partner' ? 'partner' : 'initiator';
  const ownResult = ownRole === 'partner' ? bundle.partnerResult : bundle.initiatorResult;
  const otherResult = ownRole === 'partner' ? bundle.initiatorResult : bundle.partnerResult;
  const ownLabel = bundle.profile?.displayName || 'Du';
  const otherLabel = ownRole === 'partner'
    ? (bundle.initiatorDisplayName ?? 'Initiator')
    : (bundle.partnerDisplayName ?? 'Partner');

  const comparisons = buildCategoryComparisons(ownResult.categoryScores, otherResult.categoryScores);
  const recommendations = buildJointRecommendations(comparisons);
  const perceptionOutcome = buildPerceptionOutcome(comparisons);
  const averageDifference = comparisons.length
    ? Math.round(comparisons.reduce((sum, item) => sum + item.difference, 0) / comparisons.length)
    : 0;
  const clarityInsight = buildClarityConsistencyInsight(
    bundle.initiatorResult?.filterPerceptionAnswer,
    bundle.partnerResult?.filterPerceptionAnswer,
    averageDifference,
  );

  return (
    <article className="card stack">
      <h2 className="card-title">Gemeinsames Ergebnis</h2>
      <div className="report-block">
        <strong>Block 1 · Wahrnehmungsvergleich</strong>
        <p><strong>{perceptionOutcome.title}</strong></p>
        <p>{perceptionOutcome.text}</p>
        {clarityInsight && <p>{clarityInsight}</p>}
      </div>
      <div className="stack">
        <h3 className="card-title">Block 2 · Mental-Load-Verteilung</h3>
        {comparisons.map((entry) => (
          <div className="report-block" key={`cmp-${entry.category}`}>
            <strong>{categoryLabelMap[entry.category]}</strong>
            <p>{ownLabel} {entry.own}% · {otherLabel} {entry.partner}% · Differenz {entry.difference}%</p>
            {entry.level === 'high' && <p>Spannweite: {Math.min(entry.own, entry.partner)}% bis {Math.max(entry.own, entry.partner)}%</p>}
            <div className="result-bar">
              <div className="result-bar-me" style={{ width: `${entry.own}%` }} />
            </div>
            <div className="result-bar">
              <div className="result-bar-me" style={{ width: `${entry.partner}%`, opacity: 0.55 }} />
            </div>
            <p>{entry.text}</p>
          </div>
        ))}
      </div>
      <div className="stack">
        {insights.map((insight) => (
          <div className="report-block" key={`${insight.category}-${insight.level}`}>
            <strong>{categoryLabelMap[insight.category]}</strong>
            <p>{insight.text}</p>
          </div>
        ))}
      </div>
      <div className="stack">
        <h3 className="card-title">Gemeinsame Empfehlungen</h3>
        {recommendations.map((item) => (
          <div key={item} className="report-block"><p>{item}</p></div>
        ))}
      </div>
    </article>
  );
}

function ResultBreakdown({
  title,
  result,
}: {
  title: string;
  result: {
    selfPercent: number;
    partnerPercent: number;
    statement: string;
    categories: Array<[QuizCategory, number]>;
    partnerCategoryScores?: Partial<Record<QuizCategory, number>>;
    partnerName: string;
  };
}) {
  const displayName = resolveDisplayName(title, 'Nicole');

  return (
    <>
      <h2 className="card-title">Persönliches Ergebnis {displayName}</h2>
      <p className="helper" style={{ margin: 0 }}>{result.statement}</p>
      <p className="helper" style={{ margin: 0 }}>
        Diese Verteilung ist eine subjektive Momentaufnahme und sagt nicht, ob etwas richtig oder falsch ist. Entscheidend ist, ob ihr euch beide mit der Aufteilung glücklich fühlt. Transparenz und die Sichtweise des Partners helfen euch dabei, gemeinsam zu prüfen, ob ihr etwas ändern möchtet.
      </p>
      <div className="mental-load-visual">
        <div className="mental-load-head">
          <div>
            <h3>Mental Load</h3>
            <p>Verteilung nach Kategorie</p>
          </div>
          <div className="mental-load-total">
            <strong>{result.selfPercent}%</strong>
            <span>{displayName} · gesamt</span>
          </div>
        </div>
        <div className="mental-load-legend">
          <span><i className="legend-dot self" /> {displayName}</span>
          <span><i className="legend-dot partner" /> {result.partnerName}</span>
        </div>
        <div className="mental-load-rows">
          <div className="mental-load-row">
            <div className="mental-load-row-head">
              <strong>Gesamtverteilung</strong>
              <span>{result.selfPercent}% · {result.partnerPercent}%</span>
            </div>
            <div className="result-bar dual">
              <div className="result-bar-self" style={{ width: `${result.selfPercent}%` }} />
              <div className="result-bar-partner" style={{ width: `${result.partnerPercent}%` }} />
            </div>
          </div>
          {result.categories.map(([category, value]) => {
            const partnerValue = result.partnerCategoryScores?.[category] ?? Math.max(0, 100 - value);
            return (
              <div key={category} className="mental-load-row">
                <div className="mental-load-row-head">
                  <strong>{categoryLabelMap[category]}</strong>
                  <span>{value}% · {partnerValue}%</span>
                </div>
                <div className="result-bar dual">
                  <div className="result-bar-self" style={{ width: `${value}%` }} />
                  <div className="result-bar-partner" style={{ width: `${partnerValue}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
