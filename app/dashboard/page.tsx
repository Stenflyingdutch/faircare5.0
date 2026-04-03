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
  triggerJointPreparationByPartner,
} from '@/services/partnerFlow.service';
import type { JointInsight } from '@/types/partner-flow';
import type { QuizCategory } from '@/types/quiz';

const analyzeSteps = [
  'Eure Antworten werden abgeglichen',
  'Kategorien werden einander zugeordnet',
  'Wahrnehmungen werden verglichen',
  'Gemeinsamkeiten und Unterschiede werden vorbereitet',
  'Gesamtauswertung wird erstellt',
  'Ergebnisansicht wird vorbereitet',
];

export default function DashboardPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [inviteMessage, setInviteMessage] = useState('');

  const [jointState, setJointState] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
  const [jointMessage, setJointMessage] = useState('');
  const [jointProgress, setJointProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

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
    if (!inviteEmail) return;

    setInviteState('loading');
    setInviteMessage('');
    try {
      const result = await sendPartnerInvitation(inviteEmail);
      setInviteState('success');
      setInviteMessage(`Einladung an ${result.partnerEmail} versendet.`);
      if (currentUserId) {
        const profile = await fetchAppUserProfile(currentUserId);
        if (profile?.id) {
          await refreshDashboard(profile.id);
        }
      }
    } catch (error) {
      setInviteState('error');
      setInviteMessage(error instanceof Error ? error.message : 'Einladung konnte nicht versendet werden.');
    }
  }

  async function triggerJointPreparation() {
    const userId = currentUserId;
    if (!userId) return;

    setJointState('analyzing');
    setJointProgress(0);
    setStepIndex(0);
    setJointMessage('');

    let done = false;
    const progressTicker = window.setInterval(() => {
      setJointProgress((value) => {
        if (done) return value;
        const next = Math.min(90, value + Math.random() * 6 + 4);
        return Number(next.toFixed(0));
      });
      setStepIndex((index) => (index + 1) % analyzeSteps.length);
    }, 650);

    try {
      const outcome = await triggerJointPreparationByPartner(userId);
      done = true;
      window.clearInterval(progressTicker);
      setJointProgress(100);
      setJointState('success');
      setJointMessage(
        outcome.initiatorName
          ? `Wir haben ${outcome.initiatorName} benachrichtigt. Sobald das Gesamtergebnis freigeschaltet wird, erscheint die gemeinsame Auswertung bei euch beiden im Dashboard.`
          : 'Wir haben den Initiator benachrichtigt. Sobald das Gesamtergebnis freigeschaltet wird, erscheint die gemeinsame Auswertung bei euch beiden im Dashboard.',
      );
      await refreshDashboard(userId);
    } catch (error) {
      done = true;
      window.clearInterval(progressTicker);
      setJointState('error');
      setJointMessage(error instanceof Error ? error.message : 'Die Analyse konnte nicht vorbereitet werden.');
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
            {bundle?.profile?.role === 'partner' ? (
              <>
                <h2 className="card-title">Gesamtergebnis generieren</h2>
                <p className="card-description">Sobald du startest, bereiten wir die gemeinsame Auswertung vor und benachrichtigen den Initiator zur Freischaltung.</p>

                {jointState === 'analyzing' && (
                  <div className="stack">
                    <div className="result-bar"><div className="result-bar-me" style={{ width: `${jointProgress}%`, transition: 'width 500ms ease' }} /></div>
                    <p>{jointProgress}%</p>
                    <p className="helper">{analyzeSteps[stepIndex]}</p>
                  </div>
                )}

                {jointState === 'success' && <p className="helper">{jointMessage}</p>}
                {jointState === 'error' && <p className="inline-error">{jointMessage}</p>}

                <button
                  className="button primary"
                  type="button"
                  onClick={triggerJointPreparation}
                  disabled={jointState === 'analyzing' || bundle.family?.status === 'joint_pending' || bundle.family?.status === 'joint_active'}
                >
                  {jointState === 'analyzing' ? 'Analyse läuft …' : 'Gesamtergebnis generieren'}
                </button>
              </>
            ) : (
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
                    onChange={(event) => setInviteEmail(event.target.value)}
                    disabled={inviteState === 'loading' || Boolean(bundle?.family?.partnerUserId)}
                  />
                  <button
                    type="submit"
                    className="button primary"
                    disabled={inviteState === 'loading' || Boolean(bundle?.family?.partnerUserId)}
                  >
                    {inviteState === 'loading' ? 'Einladung wird versendet …' : 'Einladung senden'}
                  </button>
                </form>
                {inviteState === 'success' && <p className="helper">{inviteMessage}</p>}
                {inviteState === 'error' && <p className="inline-error">{inviteMessage}</p>}
                {bundle?.family?.partnerUserId && <p className="helper">Es ist bereits ein Partner mit deiner Familie verbunden.</p>}
              </>
            )}
          </article>
        </div>

        {bundle?.family?.status !== 'joint_active' ? (
          <article className="card stack">
            <h2 className="card-title">Status</h2>
            <p className="helper">
              {bundle?.profile?.role === 'partner'
                ? 'Sobald der Initiator die Freischaltung bestätigt, erscheint hier eure gemeinsame Auswertung.'
                : 'Das gemeinsame Ergebnis wird erst sichtbar, nachdem dein Partner abgeschlossen und du die Freischaltung aktiviert hast.'}
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
