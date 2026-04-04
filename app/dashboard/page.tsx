'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { categoryLabelMap } from '@/services/resultCalculator';
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

export default function DashboardPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
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
      const result = await sendPartnerInvitation(email);
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
    return {
      selfPercent: bundle.ownResult.totalScore,
      partnerPercent: 100 - bundle.ownResult.totalScore,
      interpretation: bundle.ownResult.interpretation,
      categories: Object.entries(bundle.ownResult.categoryScores) as Array<[QuizCategory, number]>,
    };
  }, [bundle?.ownResult]);

  if (loading) return <section className="section"><div className="container">Lade Dashboard …</div></section>;

  return (
    <section className="section">
      <div className="container stack">
        <h1 className="test-title">Dashboard</h1>

        <div className="grid grid-2">
          <article className="card stack">
            <h2 className="card-title">Eigenes Ergebnis</h2>
            {!ownResultText ? (
              <p className="card-description">Noch kein Ergebnis verknüpft.</p>
            ) : (
              <>
                <div>
                  <p className="helper">Gesamtverteilung</p>
                  <div className="result-bar"><div className="result-bar-me" style={{ width: `${ownResultText.selfPercent}%` }} /></div>
                  <p>Du {ownResultText.selfPercent}% · Partner {ownResultText.partnerPercent}%</p>
                </div>
                <p className="helper">{ownResultText.interpretation}</p>
                <div className="stack">
                  {ownResultText.categories.map(([category, value]) => (
                    <div key={category} className="report-block">
                      <strong>{categoryLabelMap[category]}</strong>
                      <p>{value}%</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>

          <article className="card stack">
            {!bundle?.family?.partnerUserId && bundle?.profile?.role !== 'partner' ? (
              <>
                <h2 className="card-title">Partner einladen</h2>
                <p className="card-description">Lade deinen Partner per E-Mail ein. Er erhält exakt denselben Fragenkatalog – ohne Filterfragen.</p>
                <form className="stack" onSubmit={onInviteSubmit}>
                  <input
                    type="email"
                    className="input"
                    required
                    placeholder="partner@email.de"
                    value={inviteEmail}
                    onChange={(event) => {
                      setInviteEmail(event.target.value);
                      if (inviteState !== 'loading') {
                        setInviteState('idle');
                        setInviteMessage('');
                      }
                    }}
                    disabled={inviteState === 'loading'}
                  />
                  <button type="submit" className="button primary" disabled={inviteState === 'loading'}>
                    {inviteState === 'loading' ? 'Einladung wird versendet …' : 'Einladung senden'}
                  </button>
                </form>
              </>
            ) : bundle?.family?.resultsUnlocked ? (
              <>
                <h2 className="card-title">Freigabe abgeschlossen</h2>
                <p className="card-description">Eure gemeinsamen Ergebnisse sind jetzt verfügbar.</p>
              </>
            ) : bundle?.profile?.role === 'partner' ? (
              <>
                <h2 className="card-title">Status</h2>
                <p className="card-description">
                  {bundle?.family?.partnerRegistered
                    ? `Dein Test ist abgeschlossen. ${bundle?.initiatorDisplayName ?? 'Der Initiator'} wurde per E-Mail informiert, dass du das Quiz abgeschlossen hast. Die gemeinsamen Ergebnisse sind erst sichtbar, wenn ${bundle?.initiatorDisplayName ?? 'der Initiator'} den Test freigeschaltet hat.`
                    : 'Warte auf Abschluss der Registrierung.'}
                </p>
              </>
            ) : (
              <>
                <h2 className="card-title">Status</h2>
                <p className="card-description">
                  {bundle?.family?.partnerRegistered
                    ? 'Dein Partner hat den Test abgeschlossen. Du kannst jetzt die Partner- und Gesamtergebnisse freischalten.'
                    : 'Sobald dein Partner Test und Registrierung abgeschlossen hat, kannst du die gemeinsamen Ergebnisse freischalten.'}
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
        </div>

        {!bundle?.family?.resultsUnlocked ? (
          <article className="card stack">
            <h2 className="card-title">Status</h2>
            <p className="helper">
              {bundle?.profile?.role === 'partner'
                ? 'Vor der Freischaltung siehst du nur dein eigenes Ergebnis.'
                : 'Vor der Freischaltung siehst du nur dein eigenes Ergebnis.'}
            </p>
          </article>
        ) : (
          <JointResultPanel insights={bundle?.joint?.insights ?? []} bundle={bundle} />
        )}
      </div>
    </section>
  );
}

function JointResultPanel({ insights, bundle }: {
  insights: JointInsight[];
  bundle: Awaited<ReturnType<typeof fetchDashboardBundle>>;
}) {
  if (!bundle.initiatorResult || !bundle.partnerResult) return null;

  const allCategories = Array.from(new Set([
    ...Object.keys(bundle.initiatorResult.categoryScores),
    ...Object.keys(bundle.partnerResult.categoryScores),
  ])) as QuizCategory[];

  return (
    <article className="card stack">
      <h2 className="card-title">Gemeinsames Ergebnis</h2>
      <div className="grid grid-2">
        <div className="report-block">
          <strong>Initiator</strong>
          {allCategories.map((category) => (
            <p key={`i-${category}`}>{categoryLabelMap[category]}: {bundle.initiatorResult?.categoryScores[category] ?? '-'}%</p>
          ))}
        </div>
        <div className="report-block">
          <strong>Partner</strong>
          {allCategories.map((category) => (
            <p key={`p-${category}`}>{categoryLabelMap[category]}: {bundle.partnerResult?.categoryScores[category] ?? '-'}%</p>
          ))}
        </div>
      </div>
      <div className="stack">
        {insights.map((insight) => (
          <div className="report-block" key={`${insight.category}-${insight.level}`}>
            <strong>{categoryLabelMap[insight.category]}</strong>
            <p>{insight.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
