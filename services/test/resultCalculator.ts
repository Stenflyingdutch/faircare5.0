import type { OwnershipOption, OwnershipQuestion } from './questionPool';

const SCORE_MAP: Record<OwnershipOption, number> = {
  ich: 4,
  eher_ich: 3,
  beide: 2,
  eher_partner: 1,
  partner: 0,
};

export const calculateQuickResult = (
  questions: OwnershipQuestion[],
  answers: Record<string, OwnershipOption>,
  stressCategories: string[],
) => {
  const max = questions.length * 4;
  const total = questions.reduce((sum, q) => sum + (SCORE_MAP[answers[q.id]] ?? 0), 0);
  const youPercent = Math.round((total / Math.max(max, 1)) * 100);
  const partnerPercent = 100 - youPercent;

  const categoryMap: Record<string, { total: number; count: number }> = {};
  questions.forEach((q) => {
    const value = SCORE_MAP[answers[q.id]] ?? 0;
    categoryMap[q.category] = categoryMap[q.category] || { total: 0, count: 0 };
    categoryMap[q.category].total += value;
    categoryMap[q.category].count += 1;
  });

  const topCategories = Object.entries(categoryMap)
    .map(([category, data]) => ({ category, score: data.total / data.count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.category);

  const summary = youPercent >= 60
    ? 'Aus deiner Sicht liegt aktuell ein größerer Teil der Verantwortung bei dir.'
    : youPercent >= 45
      ? 'Aus deiner Sicht ist die Verantwortung teilweise ausgeglichen, aber nicht überall klar verteilt.'
      : 'Aus deiner Sicht liegt aktuell mehr Verantwortung beim Partner.';

  return { youPercent, partnerPercent, topCategories, stressCategories, summary };
};
