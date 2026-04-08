import { quizCatalog } from '@/data/questionTemplates';
import { resolveLocalizedText } from '@/types/i18n';
import type { AgeGroup, OwnershipAnswer, QuestionTemplate, QuizCategory, QuizSummary } from '@/types/quiz';

const scoreMap: Record<OwnershipAnswer, number> = {
  ich: 4,
  eher_ich: 3,
  beide: 2,
  eher_partner: 1,
  partner: 0,
};

export const categoryLabelMap: Record<QuizCategory, string> = quizCatalog.categories.reduce((acc, category) => {
  if (category.ageGroup === '0_1' && acc[category.key]) return acc;
  acc[category.key] = resolveLocalizedText(category.label, 'de');
  return acc;
}, {} as Record<QuizCategory, string>);

function resolveCategoryEntry(category: QuizCategory, ageGroup?: AgeGroup) {
  if (ageGroup) {
    const exact = quizCatalog.categories.find((entry) => entry.key === category && entry.ageGroup === ageGroup);
    if (exact) return exact;
  }

  return quizCatalog.categories.find((entry) => entry.key === category && entry.ageGroup !== '0_1')
    ?? quizCatalog.categories.find((entry) => entry.key === category)
    ?? null;
}

export function resolveCategoryLabel(category: string, ageGroup?: AgeGroup) {
  const resolved = resolveCategoryEntry(category as QuizCategory, ageGroup);
  if (resolved) return resolveLocalizedText(resolved.label, 'de');
  return categoryLabelMap[category as QuizCategory] ?? 'Unbekannter Bereich';
}

export function resolveCategoryDescription(category: string, ageGroup?: AgeGroup) {
  const resolved = resolveCategoryEntry(category as QuizCategory, ageGroup);
  if (!resolved) return '';
  return resolveLocalizedText(resolved.description, 'de', '');
}

export function isKnownQuizCategory(category: string): category is QuizCategory {
  return category in categoryLabelMap;
}

export function calculateSummary(
  questions: QuestionTemplate[],
  answers: Partial<Record<string, OwnershipAnswer>>,
): QuizSummary {
  const answered = questions.filter((question) => answers[question.id]);
  const maxScore = answered.length * 4;
  const totalScore = answered.reduce((sum, q) => sum + scoreMap[answers[q.id] as OwnershipAnswer], 0);
  const selfPercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;

  const byCategory = new Map<QuizCategory, { sum: number; count: number }>();
  for (const q of answered) {
    const key = q.categoryKey;
    const current = byCategory.get(key) ?? { sum: 0, count: 0 };
    current.sum += scoreMap[answers[q.id] as OwnershipAnswer];
    current.count += 1;
    byCategory.set(key, current);
  }

  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)
    .slice(0, 3)
    .map(([category]) => category);

  const summaryText =
    selfPercent >= 56
      ? 'Aus deiner Sicht liegt aktuell ein größerer Teil der Verantwortung bei dir.'
      : selfPercent <= 44
        ? 'Aus deiner Sicht liegt aktuell ein größerer Teil der Verantwortung bei deinem Partner.'
        : 'Aus deiner Sicht ist die Verantwortung aktuell eher ausgeglichen verteilt.';

  return {
    selfPercent,
    partnerPercent: 100 - selfPercent,
    topCategories,
    summaryText,
  };
}
