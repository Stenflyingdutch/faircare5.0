import { calculateSummary, categoryLabelMap } from '@/services/resultCalculator';
import type { DetailedReport, OwnershipAnswer, QuestionTemplate, QuizCategory } from '@/types/quiz';

const scoreMap: Record<OwnershipAnswer, number> = {
  ich: 4,
  eher_ich: 3,
  beide: 2,
  eher_partner: 1,
  partner: 0,
};

function interpretCategory(category: QuizCategory, selfPercent: number) {
  const label = categoryLabelMap[category];
  if (selfPercent >= 60) return `Im Bereich ${label} liegt aus deiner Sicht deutlich mehr Verantwortung bei dir.`;
  if (selfPercent <= 40) return `Im Bereich ${label} scheint dein Partner aktuell mehr Verantwortung zu tragen.`;
  return `Im Bereich ${label} wirkt die Verantwortung aktuell eher ausgeglichen verteilt.`;
}

export function buildDetailedReport(questions: QuestionTemplate[], answers: Partial<Record<string, OwnershipAnswer>>): DetailedReport {
  const summary = calculateSummary(questions, answers);

  const buckets = new Map<QuizCategory, { sum: number; count: number }>();
  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) continue;
    const current = buckets.get(question.categoryKey) ?? { sum: 0, count: 0 };
    current.sum += scoreMap[answer];
    current.count += 1;
    buckets.set(question.categoryKey, current);
  }

  const categories = [...buckets.entries()]
    .map(([category, value]) => {
      const selfPercent = Math.round((value.sum / (value.count * 4)) * 100);
      return {
        category,
        selfPercent,
        text: interpretCategory(category, selfPercent),
      };
    })
    .sort((a, b) => b.selfPercent - a.selfPercent);

  return {
    summary,
    categories,
    createdAt: new Date().toISOString(),
  };
}
