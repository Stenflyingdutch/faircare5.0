'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ownershipOptions } from '@/components/test/test-config';
import { getQuestionPoolByAgeGroup } from '@/services/question-pool.service';
import { loadLocalSession, persistAnswers, persistSession, saveLocalSession } from '@/services/quiz-session.service';
import type { OwnershipAnswer, QuizQuestion, TempQuizSession } from '@/types/quiz';

export default function QuizPage() {
  const router = useRouter();
  const [session, setSession] = useState<TempQuizSession | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const localSession = loadLocalSession();
    if (!localSession) {
      router.replace('/test/filter');
      return;
    }

    setSession(localSession);
    getQuestionPoolByAgeGroup(localSession.youngestAgeGroup).then((pool) => {
      const selected = pool.filter((question) => localSession.questionIds.includes(question.id));
      setQuestions(selected);
    });
  }, [router]);

  const currentQuestion = questions[index];
  const progress = questions.length > 0 ? Math.round(((index + 1) / questions.length) * 100) : 0;

  const isComplete = useMemo(
    () => Boolean(session && questions.length > 0 && questions.every((question) => Boolean(session.answers[question.id]))),
    [questions, session],
  );

  async function handleAnswer(answer: OwnershipAnswer) {
    if (!session || !currentQuestion) return;

    const updatedSession: TempQuizSession = {
      ...session,
      answers: {
        ...session.answers,
        [currentQuestion.id]: answer,
      },
    };

    setSession(updatedSession);
    saveLocalSession(updatedSession);

    try {
      await Promise.all([persistSession(updatedSession), persistAnswers(updatedSession.tempSessionId, updatedSession.answers)]);
    } catch {
      // keep local state on temporary network issues.
    }

    if (index < questions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    router.push('/test/stress');
  }

  if (!session || !currentQuestion) {
    return (
      <section className="section">
        <div className="container test-shell">Lade Fragen …</div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <div className="quiz-progress">
          <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="helper">
          Frage {index + 1} von {questions.length}
        </p>
        <h1 className="test-question">{currentQuestion.text}</h1>

        <div className="stack">
          {ownershipOptions.map((option) => (
            <button type="button" className="answer-button" key={option.value} onClick={() => handleAnswer(option.value)}>
              {option.label}
            </button>
          ))}
        </div>

        <div className="quiz-actions">
          <button type="button" className="button" onClick={() => setIndex((current) => Math.max(current - 1, 0))} disabled={index === 0}>
            Zurück
          </button>
          <button type="button" className="button secondary" disabled={!isComplete} onClick={() => router.push('/test/stress')}>
            Zum nächsten Schritt
          </button>
        </div>
      </div>
    </section>
  );
}
