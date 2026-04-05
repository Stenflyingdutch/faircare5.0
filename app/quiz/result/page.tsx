'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { questionTemplates } from '@/data/questionTemplates';
import { categoryLabelMap, calculateSummary } from '@/services/resultCalculator';
import { saveAnonymousResult } from '@/services/sessionLinking';
import { loadSessionFromStorage } from '@/services/sessionStorage';
import type { TempQuizSession } from '@/types/quiz';

export default function QuizResultPage() {
  const router = useRouter();
  const [session, setSession] = useState<TempQuizSession | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    const existing = loadSessionFromStorage();
    if (!existing) {
      router.replace('/quiz/filter');
      return;
    }
    setSession(existing);
  }, [router]);

  const summary = useMemo(() => {
    if (!session) return null;
    const questions = questionTemplates.filter((q) => session.questionIds.includes(q.id));
    return calculateSummary(questions, session.answers);
  }, [session]);

  async function endAnonymous() {
    if (!session) return;
    setIsEnding(true);
    await saveAnonymousResult(session);
    router.push('/');
  }

  if (!session || !summary) return <section className="section"><div className="container test-shell">Lade Kurz-Auswertung …</div></section>;

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Vielen Dank für Deine Teilnahme!</h1>
        <p className="helper" style={{ marginTop: -8 }}>Untenstehend findest Du deine persönlichen Ergebnisse.</p>
        <div className="result-card personal-result-summary detailed individual-result-panel single-result-dark stack">
          <div>
            <p className="helper">Gesamtverteilung</p>
            <div className="result-bar"><div className="result-bar-me" style={{ width: `${summary.selfPercent}%` }} /></div>
            <p>Du {summary.selfPercent}% · Partner {summary.partnerPercent}%</p>
          </div>
          <div>
            <p className="helper">Besonders sichtbar in:</p>
            <ul>{summary.topCategories.slice(0, 3).map((category) => <li key={category}>{categoryLabelMap[category]}</li>)}</ul>
          </div>
          {session.stressCategories.length > 0 && (
            <div>
              <p className="helper">Aktuell besonders belastend:</p>
              <ul>{session.stressCategories.map((category) => <li key={category}>{categoryLabelMap[category]}</li>)}</ul>
            </div>
          )}
          <p>{summary.summaryText}</p>
          <div className="stack">
            <button type="button" className="button primary" onClick={() => router.push('/register')}>
              Registrieren für ausführlichen Bericht
            </button>
            <button type="button" className="button secondary" onClick={endAnonymous} disabled={isEnding}>
              {isEnding ? 'Wird gespeichert …' : 'Beenden'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
