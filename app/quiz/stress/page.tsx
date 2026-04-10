'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { stressOptions } from '@/components/test/test-config';
import { resolveCategoryDescription, resolveCategoryLabel } from '@/services/resultCalculator';
import { persistQuizSession } from '@/services/firestoreQuiz';
import { loadSessionFromStorage, saveSessionToStorage } from '@/services/sessionStorage';
import type { StressSelection, TempQuizSession } from '@/types/quiz';

export default function QuizStressPage() {
  const router = useRouter();
  const [session, setSession] = useState<TempQuizSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const existing = loadSessionFromStorage();
    if (!existing) {
      router.replace('/quiz/filter');
      return;
    }
    setSession(existing);
  }, [router]);

  async function selectCategory(category: StressSelection) {
    if (!session || isSaving) return;

    setIsSaving(true);

    const updated = {
      ...session,
      stressCategories: category === 'keiner_genannten_bereiche' ? [] : [category],
      completedAt: new Date().toISOString(),
    };

    setSession(updated);
    saveSessionToStorage(updated);

    try {
      await persistQuizSession(updated);
    } catch {}

    router.push('/quiz/preparing');
  }

  if (!session) return <section className="section"><div className="container test-shell">Lade Session …</div></section>;

  const ageGroup = session.youngestAgeGroup;

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Welcher Bereich fordert dich aktuell am meisten heraus?</h1>
        <p className="helper">Einzelauswahl · Nach Auswahl geht es automatisch weiter</p>
        <div className="stack">
          {stressOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`answer-button ${session.stressCategories.includes(option.value) ? 'selected' : ''}`}
              onClick={() => selectCategory(option.value)}
              disabled={isSaving}
            >
              <strong>{option.value === 'keiner_genannten_bereiche' ? option.label : resolveCategoryLabel(option.value, ageGroup)}</strong>
              <span className="helper" style={{ marginTop: 4, display: 'block' }}>
                {option.value === 'keiner_genannten_bereiche'
                  ? 'Aktuell empfinde ich in keinem der genannten Bereiche die größte Herausforderung.'
                  : resolveCategoryDescription(option.value, ageGroup)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
