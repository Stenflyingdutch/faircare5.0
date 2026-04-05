'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { stressOptions } from '@/components/test/test-config';
import { persistQuizSession } from '@/services/firestoreQuiz';
import { loadSessionFromStorage, saveSessionToStorage } from '@/services/sessionStorage';
import type { StressCategory, TempQuizSession } from '@/types/quiz';

const stressCategoryDescriptions: Record<StressCategory, string> = {
  betreuung_entwicklung: 'Schlaf, Entwicklung und Begleitung im Alltag des Babys.',
  gesundheit: 'Vorsorge, Symptome, Medikamente und gesundheitliche Entscheidungen.',
  babyalltag_pflege: 'Essen, Wickeln, Baden, Kleidung und tägliche Pflege.',
  haushalt_einkaeufe_vorraete: 'Einkäufe, Vorräte, Wäsche und laufende Besorgungen.',
  termine_planung_absprachen: 'Kalender, Organisation, Absprachen und Zuständigkeiten.',
};

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

  async function selectCategory(category: StressCategory) {
    if (!session || isSaving) return;

    setIsSaving(true);

    const updated = {
      ...session,
      stressCategories: [category],
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

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Welcher Bereich belastet dich aktuell am meisten?</h1>
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
              <strong>{option.label}</strong>
              <span className="helper" style={{ marginTop: 4, display: 'block' }}>{stressCategoryDescriptions[option.value]}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
