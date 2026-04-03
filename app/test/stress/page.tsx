'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { stressOptions } from '@/components/test/test-config';
import { loadLocalSession, persistResult, persistSession, saveLocalSession } from '@/services/quiz-session.service';
import type { StressCategory, TempQuizSession } from '@/types/quiz';

export default function StressPage() {
  const router = useRouter();
  const [session, setSession] = useState<TempQuizSession | null>(null);

  useEffect(() => {
    const localSession = loadLocalSession();
    if (!localSession) {
      router.replace('/test/filter');
      return;
    }

    setSession(localSession);
  }, [router]);

  function toggleCategory(category: StressCategory) {
    if (!session) return;

    const exists = session.stressCategories.includes(category);
    const stressCategories = exists
      ? session.stressCategories.filter((entry) => entry !== category)
      : [...session.stressCategories, category];

    const updated = {
      ...session,
      stressCategories,
      completedAt: new Date().toISOString(),
    };

    setSession(updated);
    saveLocalSession(updated);
  }

  async function finishQuiz() {
    if (!session) return;

    const finalSession: TempQuizSession = {
      ...session,
      completedAt: session.completedAt ?? new Date().toISOString(),
    };

    saveLocalSession(finalSession);
    try {
      await Promise.all([
        persistSession(finalSession),
        persistResult(finalSession.tempSessionId, {
          stressCategories: finalSession.stressCategories,
          summary: { status: 'short_result_ready' },
        }),
      ]);
    } catch {
      // no-op for offline mode.
    }

    router.push('/test/result');
  }

  if (!session) {
    return (
      <section className="section">
        <div className="container test-shell">Lade Session …</div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Welche Bereiche belasten dich aktuell am meisten?</h1>
        <p className="helper">Optional · Mehrfachauswahl</p>
        <div className="stack">
          {stressOptions.map((option) => {
            const selected = session.stressCategories.includes(option.value);
            return (
              <button
                type="button"
                key={option.value}
                className={`answer-button ${selected ? 'selected' : ''}`}
                onClick={() => toggleCategory(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <button type="button" className="button primary" onClick={finishQuiz}>
          Kurz-Auswertung anzeigen
        </button>
      </div>
    </section>
  );
}
