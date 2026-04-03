'use client';

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ownershipOptions } from '@/components/test/test-config';
import { questionTemplates } from '@/data/questionTemplates';
import { persistQuizAnswers, persistQuizSession } from '@/services/firestoreQuiz';
import { loadSessionFromStorage, saveSessionToStorage } from '@/services/sessionStorage';
import type { OwnershipAnswer, TempQuizSession } from '@/types/quiz';

export default function QuizQuestionPage() {
  const router = useRouter();
  const params = useParams<{ index: string }>();
  const [session, setSession] = useState<TempQuizSession | null>(null);
  const index = Number(params?.index || 0);

  useEffect(() => {
    const existing = loadSessionFromStorage();
    if (!existing) {
      router.replace('/quiz/filter');
      return;
    }
    setSession(existing);
  }, [router]);

  const selectedQuestions = useMemo(() => {
    if (!session) return [];
    return session.questionIds.map((id) => questionTemplates.find((q) => q.id === id)).filter(Boolean);
  }, [session]);

  if (!session || !selectedQuestions.length) return <section className="section"><div className="container test-shell">Lade Fragen …</div></section>;

  if (index < 0 || index >= selectedQuestions.length) {
    router.replace('/quiz/question/0');
    return null;
  }

  const current = selectedQuestions[index]!;
  const progress = Math.round(((index + 1) / selectedQuestions.length) * 100);

  async function selectAnswer(answer: OwnershipAnswer) {
    if (!session) return;
    const updated = { ...session, answers: { ...session.answers, [current.id]: answer } };
    setSession(updated);
    saveSessionToStorage(updated);
    try {
      await Promise.all([persistQuizSession(updated), persistQuizAnswers(updated)]);
    } catch {}
  }

  function next() {
    if (!session || !session.answers[current.id]) return;
    if (index === selectedQuestions.length - 1) {
      router.push('/quiz/stress');
      return;
    }
    router.push(`/quiz/question/${index + 1}`);
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <div className="quiz-progress"><div className="quiz-progress-bar" style={{ width: `${progress}%` }} /></div>
        <p className="helper">Frage {index + 1} von {selectedQuestions.length}</p>
        <h1 className="test-question">{current.text}</h1>

        <div className="stack">
          {ownershipOptions.map((option) => (
            <button key={option.value} type="button" className={`answer-button ${session.answers[current.id] === option.value ? 'selected' : ''}`} onClick={() => selectAnswer(option.value)}>
              {option.label}
            </button>
          ))}
        </div>

        <div className="quiz-actions">
          <button type="button" className="button" onClick={() => router.push(index === 0 ? '/quiz/filter' : `/quiz/question/${index - 1}`)}>Zurück</button>
          <button type="button" className="button primary" disabled={!session.answers[current.id]} onClick={next}>Weiter</button>
        </div>
      </div>
    </section>
  );
}
