'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getStressCategoryLabel } from '@/services/quiz-evaluation.service';
import { evaluateQuiz } from '@/services/quiz-evaluation.service';
import { getQuestionPoolByAgeGroup } from '@/services/question-pool.service';
import { loadLocalSession } from '@/services/quiz-session.service';
import type { QuizQuestion, TempQuizSession } from '@/types/quiz';

export default function ResultPage() {
  const router = useRouter();
  const [session, setSession] = useState<TempQuizSession | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    const localSession = loadLocalSession();
    if (!localSession) {
      router.replace('/test/filter');
      return;
    }

    setSession(localSession);
    getQuestionPoolByAgeGroup(localSession.youngestAgeGroup).then((pool) => {
      setQuestions(pool.filter((question) => localSession.questionIds.includes(question.id)));
    });
  }, [router]);

  if (!session || questions.length === 0) {
    return (
      <section className="section">
        <div className="container test-shell">Lade Kurz-Auswertung …</div>
      </section>
    );
  }

  const summary = evaluateQuiz(questions, session.answers);

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Deine Kurz-Auswertung</h1>

        <div className="result-card stack">
          <div>
            <p className="helper">Gesamtverteilung</p>
            <div className="result-bar">
              <div className="result-bar-me" style={{ width: `${summary.mePercent}%` }} />
            </div>
            <p>
              Du {summary.mePercent}% · Partner {summary.partnerPercent}%
            </p>
          </div>

          <div>
            <p className="helper">Besonders sichtbar in:</p>
            <ul>
              {summary.topCategories.map((category) => (
                <li key={category}>{getStressCategoryLabel(category)}</li>
              ))}
            </ul>
          </div>

          {session.stressCategories.length > 0 && (
            <div>
              <p className="helper">Aktuell besonders belastend:</p>
              <ul>
                {session.stressCategories.map((category) => (
                  <li key={category}>{getStressCategoryLabel(category)}</li>
                ))}
              </ul>
            </div>
          )}

          <p>{summary.summaryText}</p>

          <button type="button" className="button secondary">
            Auswertung speichern und vollständig ansehen
          </button>
        </div>

        <Link href="/test/filter" className="helper">
          Test neu starten
        </Link>
      </div>
    </section>
  );
}
