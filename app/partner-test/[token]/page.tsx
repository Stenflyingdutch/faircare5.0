'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ownershipOptions } from '@/components/test/test-config';
import { completePartnerSession, resolveInvitationByToken, savePartnerFilterPerception, savePartnerSessionAnswer } from '@/services/partnerFlow.service';
import { loadPartnerLocalSession, savePartnerLocalSession, type PartnerLocalSession } from '@/services/partnerSessionStorage';
import type { OwnershipAnswer } from '@/types/quiz';

const perceptionOptions = [
  { value: 'eher_ich', label: 'eher ich' },
  { value: 'mehr_ich', label: 'mehr ich' },
  { value: 'ungefaehr_gleich', label: 'ungefähr gleich' },
  { value: 'mehr_partner', label: 'mehr Partner' },
  { value: 'eher_partner', label: 'eher Partner' },
];

export default function PartnerTestPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PartnerLocalSession | null>(loadPartnerLocalSession());

  useEffect(() => {
    const token = params?.token;
    const stored = loadPartnerLocalSession();
    if (!token || !stored || stored.invitationToken !== token) {
      router.replace(`/invite/${token}`);
      return;
    }

    resolveInvitationByToken(token).then((result) => {
      if (result.status !== 'valid') {
        router.replace(`/invite/${token}`);
        return;
      }
      setSession(stored);
      setLoading(false);
    });
  }, [params?.token, router]);

  if (loading || !session) return <section className="section"><div className="container test-shell">Partner-Test wird geladen …</div></section>;

  const question = session.questions[index];
  const totalSteps = session.questions.length + 1;
  const currentStep = session.perceptionAnswer ? index + 2 : 1;
  const progress = Math.round((currentStep / totalSteps) * 100);

  async function selectPerception(value: string) {
    if (!session) return;
    const next = { ...session, perceptionAnswer: value };
    setSession(next);
    savePartnerLocalSession(next);
    await savePartnerFilterPerception(session.sessionId, value);
  }

  async function selectAnswer(answer: OwnershipAnswer) {
    if (!session) return;
    const next = {
      ...session,
      answers: {
        ...session.answers,
        [question.id]: answer,
      },
    };
    setSession(next);
    savePartnerLocalSession(next);
    await savePartnerSessionAnswer(session.sessionId, next.answers);
  }

  async function next() {
    if (!session) return;
    if (!session.perceptionAnswer) return;
    if (!session.answers[question.id]) return;
    if (index === session.questions.length - 1) {
      setFinishing(true);
      setError(null);
      try {
        const completed = await completePartnerSession(session.sessionId, session.answers);
        savePartnerLocalSession({ ...session, completedAt: completed.resultDraft.completedAt });
        router.push(`/register-after-test?token=${session.invitationToken}`);
      } catch {
        setError('Der Test konnte nicht final gespeichert werden. Bitte erneut versuchen.');
        setFinishing(false);
      }
      return;
    }
    setIndex((current) => current + 1);
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <div className="quiz-progress"><div className="quiz-progress-bar" style={{ width: `${progress}%` }} /></div>
        {!session.perceptionAnswer ? (
          <>
            <p className="helper">Schritt 1 von {totalSteps}</p>
            <h1 className="test-question">Wie nimmst du die aktuelle Verteilung wahr?</h1>
            <div className="stack">
              {perceptionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`answer-button ${session.perceptionAnswer === option.value ? 'selected' : ''}`}
                  onClick={() => selectPerception(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="helper">Frage {index + 1} von {session.questions.length}</p>
            <h1 className="test-question">{question.text}</h1>
            <div className="stack">
              {ownershipOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`answer-button ${session.answers[question.id] === option.value ? 'selected' : ''}`}
                  onClick={() => selectAnswer(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="inline-error">{error}</p>}

        <div className="quiz-actions">
          <button type="button" className="button" onClick={() => setIndex((current) => Math.max(current - 1, 0))} disabled={index === 0 || finishing || !session.perceptionAnswer}>Zurück</button>
          <button
            type="button"
            className="button primary"
            onClick={next}
            disabled={!session.perceptionAnswer || !session.answers[question.id] || finishing}
          >
            {index === session.questions.length - 1 ? (finishing ? 'Wird gespeichert …' : 'Abschließen') : 'Weiter'}
          </button>
        </div>
      </div>
    </section>
  );
}
