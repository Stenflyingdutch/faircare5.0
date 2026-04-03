'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { stressOptions } from '@/components/test/test-config';
import { persistQuizSession } from '@/services/firestoreQuiz';
import { loadSessionFromStorage, saveSessionToStorage } from '@/services/sessionStorage';
import type { StressCategory, TempQuizSession } from '@/types/quiz';

export default function QuizStressPage() {
  const router = useRouter();
  const [session, setSession] = useState<TempQuizSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = loadSessionFromStorage();
    if (!existing) {
      router.replace('/quiz/filter');
      return;
    }
    setSession(existing);
  }, [router]);

  function toggleCategory(category: StressCategory) {
    if (!session) return;
    setError(null);
    const exists = session.stressCategories.includes(category);
    if (!exists && session.stressCategories.length >= 3) {
      setError('Du kannst maximal 3 Bereiche auswählen.');
      return;
    }

    const updated = {
      ...session,
      stressCategories: exists ? session.stressCategories.filter((item) => item !== category) : [...session.stressCategories, category],
      completedAt: new Date().toISOString(),
    };

    setSession(updated);
    saveSessionToStorage(updated);
  }

  async function finish() {
    if (!session) return;
    try {
      await persistQuizSession(session);
    } catch {}
    router.push('/quiz/result');
  }

  if (!session) return <section className="section"><div className="container test-shell">Lade Session …</div></section>;

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Welche Bereiche belasten dich aktuell am meisten?</h1>
        <p className="helper">Optional · Mehrfachauswahl (max. 3)</p>
        <div className="stack">
          {stressOptions.map((option) => (
            <button key={option.value} type="button" className={`answer-button ${session.stressCategories.includes(option.value) ? 'selected' : ''}`} onClick={() => toggleCategory(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        {error && <p className="inline-error">{error}</p>}
        <button type="button" className="button primary" onClick={finish}>Kurz-Auswertung anzeigen</button>
      </div>
    </section>
  );
}
