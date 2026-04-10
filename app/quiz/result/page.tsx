'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { questionTemplates } from '@/data/questionTemplates';
import { calculateSummary, resolveCategoryLabel } from '@/services/resultCalculator';
import { saveAnonymousResult } from '@/services/sessionLinking';
import { loadSessionFromStorage } from '@/services/sessionStorage';
import type { AgeGroup, OwnershipAnswer, QuizCategory, StressSelection, TempQuizSession } from '@/types/quiz';

const scoreMap: Record<OwnershipAnswer, number> = {
  ich: 4,
  eher_ich: 3,
  beide: 2,
  eher_partner: 1,
  partner: 0,
};

function resolvePerceivedStressLabel(stressCategories: StressSelection[], ageGroup?: AgeGroup) {
  if (!stressCategories.length || stressCategories[0] === 'keiner_genannten_bereiche') return 'In keiner der genannten Bereiche.';
  return `${resolveCategoryLabel(stressCategories[0], ageGroup)}.`;
}

function buildHighestLoadSummary(categories: Array<[QuizCategory, number]>, ageGroup?: AgeGroup) {
  const maxScore = Math.max(...categories.map(([, value]) => value));
  const highestCategories = categories
    .filter(([, value]) => value === maxScore)
    .map(([category]) => resolveCategoryLabel(category, ageGroup));

  if (highestCategories.length === 1) return `${highestCategories[0]} (${maxScore} %).`;
  if (highestCategories.length === 2) return `${highestCategories[0]} und ${highestCategories[1]} (je ${maxScore} %).`;
  return `Es wurde in mehreren Bereichen eine hohe Herausforderung wahrgenommen (je ${maxScore} %).`;
}


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

  const categoryBreakdown = useMemo(() => {
    if (!session) return [] as Array<[QuizCategory, number]>;
    const questions = questionTemplates.filter((q) => session.questionIds.includes(q.id));
    const byCategory = new Map<QuizCategory, { sum: number; count: number }>();

    questions.forEach((q) => {
      const answer = session.answers[q.id];
      if (!answer) return;
      const current = byCategory.get(q.categoryKey) ?? { sum: 0, count: 0 };
      current.sum += scoreMap[answer];
      current.count += 1;
      byCategory.set(q.categoryKey, current);
    });

    return [...byCategory.entries()]
      .map(([category, value]) => [category, Math.round((value.sum / (value.count * 4)) * 100)] as [QuizCategory, number])
      .sort((a, b) => b[1] - a[1]);
  }, [session]);

  async function endAnonymous() {
    if (!session) return;
    setIsEnding(true);
    await saveAnonymousResult(session);
    router.push('/');
  }

  if (!session || !summary) return <section className="section"><div className="container test-shell">Lade Kurz-Auswertung …</div></section>;

  const ageGroup = session.youngestAgeGroup;

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Du, das hier ist deine persönliche Zusammenfassung:</h1>
        <div className="result-card personal-result-summary detailed individual-result-panel single-result-dark stack">
          <p>{summary.summaryText}</p>
          <div className="result-overview-grid">
            <div className="result-donut-wrap">
              <div
                className="result-donut"
                style={{ background: `conic-gradient(#7d74e8 0 ${summary.selfPercent}%, #d9d8e4 ${summary.selfPercent}% 100%)` }}
              >
                <div className="result-donut-inner">
                  <strong>{summary.selfPercent}%</strong>
                  <span>Du</span>
                </div>
              </div>
              <p className="helper"><strong>Gesamtanteil</strong></p>
            </div>
            <div className="result-highlight-grid">
              <p style={{ margin: 0 }}>
                <strong>Bereich mit der höchsten Mental-Load-Bewertung:</strong>{' '}
                {categoryBreakdown.length ? buildHighestLoadSummary(categoryBreakdown, ageGroup) : 'Noch keine ausreichenden Angaben.'}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Größte empfundene Herausforderung:</strong> {resolvePerceivedStressLabel(session.stressCategories, ageGroup)}
              </p>
            </div>
          </div>
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
