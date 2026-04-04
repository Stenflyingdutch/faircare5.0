'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { fetchActionBurdenCategoriesByFamily } from '@/services/actionBoards.service';
import { recommendActionCategories } from '@/services/actionCategories';
import { observeAuthState, signOutUser } from '@/services/auth.service';
import {
  ensureUserProfile,
  fetchDashboardBundle,
  openSharedResultsView,
  sendPartnerInvitation,
  unlockPartnerAndJointResults,
} from '@/services/partnerFlow.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import { buildCategoryComparisons } from '@/services/resultInsights';
import type { QuizCategory } from '@/types/quiz';

function sortCategoriesByOwnShareAscending(categories: Array<[QuizCategory, number]>) {
  return [...categories].sort(([, valueA], [, valueB]) => valueA - valueB);
}

function buildNeutralDistributionStatement(selfPercent: number) {
  if (selfPercent > 55) return 'Aus deiner Sicht liegt aktuell ein größerer Teil der Mental Load bei dir.';
  if (selfPercent < 45) return 'Aus deiner Sicht liegt aktuell ein größerer Teil der Mental Load bei deinem Partner.';
  return 'Aus deiner Sicht ist die Mental Load aktuell eher gleich verteilt.';
}

function resolveDisplayName(value?: string | null, fallback = 'Nutzer') {
  return value?.trim() || fallback;
}

function deriveNameFromEmail(email?: string | null) {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return local || null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePersonalMessage, setInvitePersonalMessage] = useState('Ich habe den FairCare Test gemacht und würde mich freuen, wenn du ihn auch ausfüllst. Danach können wir unsere Ergebnisse gemeinsam anschauen.');
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'success' | 'warning' | 'error'>('idle');
  const [inviteMessage, setInviteMessage] = useState('');
  const [unlockState, setUnlockState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [unlockMessage, setUnlockMessage] = useState('');
  const [openSharedState, setOpenSharedState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [openSharedMessage, setOpenSharedMessage] = useState('');
  const [burdenInput, setBurdenInput] = useState<{ initiator: QuizCategory[]; partner: QuizCategory[] }>({ initiator: [], partner: [] });

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
    if (!bundle?.family?.id || !bundle.family.resultsUnlocked || !bundle.family.sharedResultsOpened) return;
    fetchActionBurdenCategoriesByFamily(bundle.family.id).then(setBurdenInput).catch(() => setBurdenInput({ initiator: [], partner: [] }));
  }, [bundle?.family?.id, bundle?.family?.resultsUnlocked, bundle?.family?.sharedResultsOpened]);

  const recommendation = useMemo(() => {
    if (!bundle?.initiatorResult?.categoryScores || !bundle?.partnerResult?.categoryScores) return null;
    return recommendActionCategories({
      initiatorScores: bundle.initiatorResult.categoryScores,
      partnerScores: bundle.partnerResult.categoryScores,
      initiatorBurdenCategories: burdenInput.initiator,
      partnerBurdenCategories: burdenInput.partner,
      initiatorClarity: bundle.initiatorResult.filterPerceptionAnswer,
      partnerClarity: bundle.partnerResult.filterPerceptionAnswer,
    });
  }, [bundle?.initiatorResult?.categoryScores, bundle?.partnerResult?.categoryScores, burdenInput, bundle?.initiatorResult?.filterPerceptionAnswer, bundle?.partnerResult?.filterPerceptionAnswer]);

  async function onInviteSubmit(event: FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      setInviteState('error');
      setInviteMessage('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setInviteState('loading');
    try {
      const result = await sendPartnerInvitation(email, invitePersonalMessage);
      setInviteState(result.delivery === 'saved_without_email' ? 'warning' : 'success');
      setInviteMessage(result.delivery === 'saved_without_email' ? 'Einladung gespeichert (kein Mailversand im noop Modus).' : `Einladung an ${result.partnerEmail} versendet.`);
      if (currentUserId) await refreshDashboard(currentUserId);
    } catch (error) {
      setInviteState('error');
      setInviteMessage(error instanceof Error ? error.message : 'Einladung konnte nicht gesendet werden.');
    }
  }

  async function unlockSharedResults() {
    if (!currentUserId) return;
    setUnlockState('loading');
    try {
      const result = await unlockPartnerAndJointResults(currentUserId);
      setUnlockState('success');
      setUnlockMessage(result.alreadyActive ? 'Bereits freigeschaltet.' : 'Gemeinsame Ergebnisse freigeschaltet.');
      await refreshDashboard(currentUserId);
    } catch (error) {
      setUnlockState('error');
      setUnlockMessage(error instanceof Error ? error.message : 'Freischaltung fehlgeschlagen.');
    }
  }

  async function openSharedViewForBoth() {
    if (!currentUserId) return;
    setOpenSharedState('loading');
    try {
      await openSharedResultsView(currentUserId);
      await refreshDashboard(currentUserId);
      setOpenSharedState('idle');
    } catch (error) {
      setOpenSharedState('error');
      setOpenSharedMessage(error instanceof Error ? error.message : 'Öffnen fehlgeschlagen.');
    }
  }

  if (loading) return <section className="section"><div className="container">Lade Dashboard …</div></section>;

  const partnerLabel = resolveDisplayName(bundle?.partnerDisplayName, deriveNameFromEmail(bundle?.invitationPartnerEmail) ?? 'Partner');
  const ownResultText = bundle?.ownResult ? {
    selfPercent: bundle.ownResult.totalScore,
    statement: buildNeutralDistributionStatement(bundle.ownResult.totalScore),
    categories: sortCategoriesByOwnShareAscending(
      Object.entries(bundle.ownResult.categoryScores) as Array<[QuizCategory, number]>,
    ),
  } : null;

  return (
    <section className="section">
      <div className="container stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="test-title">Dashboard</h1>
          <button type="button" className="button" onClick={async () => { await signOutUser(); router.push('/login'); }}>Logout</button>
        </div>

        <article className="card stack">
          {!ownResultText
            ? <p className="card-description">Noch kein Ergebnis verknüpft.</p>
            : (
              <ResultBreakdown
                title={resolveDisplayName(bundle?.profile?.displayName, 'Du')}
                partnerName={partnerLabel}
                result={ownResultText}
              />
            )}
        </article>

        <article className="card stack">
          <h2 className="card-title">Status</h2>
          {bundle?.profile?.role !== 'partner' && !bundle?.family?.partnerRegistered ? (
            <form className="stack" onSubmit={onInviteSubmit}>
              <p className="helper">Dein Ergebnis ist da. Lade jetzt deinen Partner ein.</p>
              <input type="email" className="input" required placeholder="E-Mail deines Partners" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} disabled={inviteState === 'loading'} />
              <textarea className="input" rows={4} value={invitePersonalMessage} onChange={(event) => setInvitePersonalMessage(event.target.value)} />
              <button type="submit" className="button primary">Einladung senden</button>
              {inviteState !== 'idle' && <p className={inviteState === 'error' ? 'inline-error' : 'helper'}>{inviteMessage}</p>}
            </form>
          ) : bundle?.family?.resultsUnlocked ? (
            <>
              <p className="helper">{bundle.family.sharedResultsOpened ? 'Gemeinsame Ergebnisse sind geöffnet.' : 'Gemeinsame Ergebnisse sind bereit.'}</p>
              {!bundle.family.sharedResultsOpened && <button className="button primary" type="button" onClick={openSharedViewForBoth}>Gemeinsame Ergebnisse anschauen</button>}
              {openSharedState === 'error' && <p className="inline-error">{openSharedMessage}</p>}
            </>
          ) : bundle?.profile?.role === 'partner' ? (
            <p className="helper">Warte auf Freischaltung durch den Initiator.</p>
          ) : (
            <>
              <p className="helper">Partner fertig? Dann jetzt freischalten.</p>
              <button className="button primary" type="button" onClick={unlockSharedResults} disabled={unlockState === 'loading'}>{unlockState === 'loading' ? 'Freischaltung läuft …' : 'Partner- und Gesamtergebnis freischalten'}</button>
              {unlockState !== 'idle' && <p className={unlockState === 'error' ? 'inline-error' : 'helper'}>{unlockMessage}</p>}
            </>
          )}
        </article>

        {bundle?.family?.resultsUnlocked && bundle?.family?.sharedResultsOpened && (
          <>
            <JointResultPanel bundle={bundle} partnerLabel={partnerLabel} />
            {recommendation && (
              <article className="card stack">
                <h3 className="card-title">Nächster Schritt</h3>
                <p className="helper">{recommendation.actionCategorySummaryText}</p>
                <button type="button" className="button primary" onClick={() => router.push('/workspace/ownership-board?setup=1')}>Nächsten Schritt starten</button>
              </article>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function JointResultPanel({ bundle, partnerLabel }: { bundle: Awaited<ReturnType<typeof fetchDashboardBundle>>; partnerLabel: string }) {
  if (!bundle.initiatorResult || !bundle.partnerResult) return null;
  const comparisons = buildCategoryComparisons(bundle.initiatorResult.categoryScores, bundle.partnerResult.categoryScores);

  return (
    <article className="card stack">
      <h2 className="card-title">Gemeinsames Ergebnis</h2>
      {comparisons.map((entry) => (
        <div className="report-block" key={entry.category}>
          <strong>{categoryLabelMap[entry.category]}</strong>
          <p className="helper">{resolveDisplayName(bundle.initiatorDisplayName, 'Du')} vs. {partnerLabel} · Differenz {entry.difference}%</p>
        </div>
      ))}
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
  };
}) {
  const displayName = resolveDisplayName(title, 'Du');
  const sortedCategories = [...result.categories].sort((a, b) => b[1] - a[1]);
  const highestLoad = sortedCategories[0];
  const mostBalanced = [...result.categories].sort((a, b) => Math.abs(a[1] - 50) - Math.abs(b[1] - 50))[0];

  return (
    <>
      <h2 className="card-title">Persönliches Ergebnis {displayName}</h2>
      <p className="helper" style={{ margin: 0 }}>{result.statement}</p>
      <p className="helper" style={{ margin: 0 }}>
        Diese Verteilung ist eine subjektive Momentaufnahme und sagt nicht, ob etwas richtig oder falsch ist. Entscheidend ist, ob ihr euch beide mit der Aufteilung glücklich fühlt.
      </p>
      <div className="personal-result-summary detailed individual-result-panel">
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
            <div>
              <p className="helper">Höchste Last</p>
              <p className="result-highlight-primary">
                {categoryLabelMap[highestLoad[0]]} · {highestLoad[1]}%
              </p>
            </div>
            <div>
              <p className="helper">Ausgeglichen</p>
              <p className="result-highlight-accent">
                {categoryLabelMap[mostBalanced[0]]} · {mostBalanced[1]}%
              </p>
            </div>
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
