'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { categoryLabelMap } from '@/services/resultCalculator';
import {
  buildCategoryComparisons,
} from '@/services/resultInsights';
import { observeAuthState, signOutUser } from '@/services/auth.service';
import {
  ensureUserProfile,
  fetchDashboardBundle,
  fetchAppUserProfile,
  sendPartnerInvitation,
  openSharedResultsView,
  unlockPartnerAndJointResults,
} from '@/services/partnerFlow.service';
import type { QuizCategory } from '@/types/quiz';

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

function deriveNameFromEmail(email?: string | null) {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return normalizeName(local);
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
  const [openSharedState, setOpenSharedState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [openSharedMessage, setOpenSharedMessage] = useState('');

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

  async function openSharedViewForBoth() {
    const userId = currentUserId;
    if (!userId) return;
    setOpenSharedState('loading');
    setOpenSharedMessage('');
    try {
      await openSharedResultsView(userId);
      setOpenSharedState('idle');
      await refreshDashboard(userId);
    } catch (error) {
      setOpenSharedState('error');
      setOpenSharedMessage(error instanceof Error ? error.message : 'Gemeinsame Ansicht konnte nicht geöffnet werden.');
    }
  }


  async function logout() {
    await signOutUser();
    router.push('/login');
  }

  const ownResultText = useMemo(() => {
    if (!bundle?.ownResult) return null;
    return {
      selfPercent: bundle.ownResult.totalScore,
      statement: buildNeutralDistributionStatement(bundle.ownResult.totalScore),
      categories: sortCategoriesByOwnShareAscending(
        Object.entries(bundle.ownResult.categoryScores) as Array<[QuizCategory, number]>,
      ),
    };
  }, [bundle?.ownResult]);
  const resolvedPartnerName = bundle?.profile?.role === 'partner'
    ? bundle?.initiatorDisplayName
    : bundle?.partnerDisplayName;
  const invitationPartnerName = deriveNameFromEmail(bundle?.invitationPartnerEmail);
  const partnerLabel = resolveDisplayName(resolvedPartnerName, invitationPartnerName ?? 'Partner');

  const canInvitePartner = bundle?.profile?.role !== 'partner' && !bundle?.family?.partnerRegistered;

  if (loading) return <section className="section"><div className="container">Lade Dashboard …</div></section>;

  return (
    <section className="section">
      <div className="container stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="test-title">Dashboard</h1>
          <button type="button" className="button" onClick={logout}>Logout</button>
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

        {canInvitePartner && (
          <article className="card stack">
            <h2 className="card-title">Partner einladen</h2>
            <p className="card-description">Trage die E-Mail-Adresse deines Partners ein. Danach kann er denselben Fragenkatalog ausfüllen.</p>
            <form className="stack" onSubmit={onInviteSubmit}>
              <input type="email" className="input" required placeholder="E-Mail deines Partners" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} disabled={inviteState === 'loading'} />
              <textarea className="input" rows={5} value={invitePersonalMessage} onChange={(event) => setInvitePersonalMessage(event.target.value)} aria-label="Persönliche Nachricht" placeholder="Persönliche Nachricht" />
              <button type="submit" className="button primary" disabled={inviteState === 'loading'}>
                {inviteState === 'loading' ? 'Einladung wird versendet …' : 'Einladung an Partner senden'}
              </button>
            </form>
          </article>
        )}

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
            </>
          ) : bundle?.family?.resultsUnlocked ? (
            <>
              <h2 className="card-title">Status</h2>
              <p className="card-description">
                {bundle?.family?.sharedResultsOpened
                  ? 'Eure gemeinsamen Ergebnisse werden unten angezeigt.'
                  : 'Eure gemeinsamen Ergebnisse sind bereit.'}
              </p>
              {!bundle?.family?.sharedResultsOpened && (
                <button className="button primary" type="button" onClick={openSharedViewForBoth} disabled={openSharedState === 'loading'}>
                  Gemeinsame Ergebnisse anschauen
                </button>
              )}
              {openSharedState === 'error' && <p className="inline-error">{openSharedMessage}</p>}
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

        {bundle?.family?.resultsUnlocked && bundle?.family?.sharedResultsOpened && (
          <JointResultPanel bundle={bundle} />
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

  return (
    <article className="card stack">
      <h2 className="card-title">Gemeinsames Ergebnis</h2>
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
                {hasGap && <span className="helper" style={{ border: '1px solid currentColor', padding: '2px 8px', borderRadius: 999 }}>Lücke erkannt</span>}
              </div>
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
  };
}) {
  const displayName = resolveDisplayName(title, 'Nicole');
  const sortedCategories = [...result.categories].sort((a, b) => b[1] - a[1]);
  const highestLoad = sortedCategories[0];
  const mostBalanced = [...result.categories].sort((a, b) => Math.abs(a[1] - 50) - Math.abs(b[1] - 50))[0];

  return (
    <>
      <h2 className="card-title">Persönliches Ergebnis {displayName}</h2>
      <p className="helper" style={{ margin: 0 }}>{result.statement}</p>
      <p className="helper" style={{ margin: 0 }}>
        Diese Verteilung ist eine subjektive Momentaufnahme und sagt nicht, ob etwas richtig oder falsch ist. Entscheidend ist, ob ihr euch beide mit der Aufteilung glücklich fühlt. Transparenz und die Sichtweise des Partners helfen euch dabei, gemeinsam zu prüfen, ob ihr etwas ändern möchtet.
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
