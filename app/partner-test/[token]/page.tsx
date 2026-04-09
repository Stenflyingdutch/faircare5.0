'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ownershipOptions, splitClarityOptions } from '@/components/test/test-config';
import { resolveInvitationByToken, sanitizeInvitationToken, savePartnerFilterPerception, savePartnerSessionAnswer } from '@/services/partnerFlow.service';
import { loadPartnerLocalSession, savePartnerLocalSession, type PartnerLocalSession } from '@/services/partnerSessionStorage';
import type { OwnershipAnswer } from '@/types/quiz';

function normalizeName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function resolveCounterpartName(session: PartnerLocalSession | null) {
  return normalizeName(session?.counterpartName) || 'Partner';
}

export default function PartnerTestPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PartnerLocalSession | null>(loadPartnerLocalSession());

  useEffect(() => {
    const token = sanitizeInvitationToken(params?.token);
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

  const counterpartName = useMemo(() => resolveCounterpartName(session), [session]);
  const resolvedOwnershipOptions = useMemo(() => ownershipOptions.map((option) => {
    if (option.value === 'partner') return { ...option, label: counterpartName };
    if (option.value === 'eher_partner') return { ...option, label: `eher ${counterpartName}` };
    return option;
  }), [counterpartName]);

  if (loading || !session) return <section className="section"><div className="container test-shell">Partner-Test wird geladen …</div></section>;

  const question = session.questions[index];
  const totalSteps = session.questions.length + 1;
  const currentStep = session.perceptionAnswer ? index + 2 : 1;
  const progress = Math.round((currentStep / totalSteps) * 100);

  async function selectPerception(value: string) {
    if (!session || finishing) return;
    const next = { ...session, perceptionAnswer: value };
    setSession(next);
    savePartnerLocalSession(next);
    try {
      await savePartnerFilterPerception(next.sessionId, value);
    } catch {
      setError('Antwort konnte nicht gespeichert werden. Bitte erneut auswählen.');
    }
  }

  async function selectAnswer(answer: OwnershipAnswer) {
    if (!session || finishing) return;
    const nextAnswers = {
      ...session.answers,
      [question.id]: answer,
    };

    const nextSession = {
      ...session,
      answers: nextAnswers,
    };

    setSession(nextSession);
    savePartnerLocalSession(nextSession);

    try {
      await savePartnerSessionAnswer(session.sessionId, nextAnswers);
    } catch {
      setError('Antwort konnte nicht gespeichert werden. Bitte erneut auswählen.');
      return;
    }

    if (index === session.questions.length - 1) {
      router.push(`/partner-test/${session.invitationToken}/stress`);
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
            <h1 className="test-title">Mach sichtbar, was im Alltag oft unsichtbar mitläuft.</h1>
            <fieldset className="quiz-fieldset stack">
              <legend>Wie klar ist eure Aufteilung heute?</legend>
              <div className="stack">
                {splitClarityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`option-chip ${session.perceptionAnswer === option.value ? 'selected' : ''}`}
                    onClick={() => selectPerception(option.value)}
                    disabled={finishing}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <>
            <p className="helper">Frage {index + 1} von {session.questions.length}</p>
            <h1 className="test-question">{question.questionText?.de ?? question.id}</h1>
            <div className="stack">
              {resolvedOwnershipOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`answer-button ${session.answers[question.id] === option.value ? 'selected' : ''}`}
                  onClick={() => selectAnswer(option.value)}
                  disabled={finishing}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="inline-error">{error}</p>}

        <div className="quiz-actions">
          <button
            type="button"
            className="button"
            onClick={() => setIndex((current) => Math.max(current - 1, 0))}
            disabled={index === 0 || finishing || !session.perceptionAnswer}
          >
            Zurück
          </button>
        </div>
      </div>
    </section>
  );
}
