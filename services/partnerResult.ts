import { categoryLabelMap } from '@/services/resultCalculator';
import type { OwnershipAnswer, QuestionTemplate, QuizCategory } from '@/types/quiz';
import type { JointInsight } from '@/types/partner-flow';

const scoreMap: Record<OwnershipAnswer, number> = {
  ich: 4,
  eher_ich: 3,
  beide: 2,
  eher_partner: 1,
  partner: 0,
};

export function computeCategoryScores(
  questions: QuestionTemplate[],
  answers: Partial<Record<string, OwnershipAnswer>>,
): Record<QuizCategory, number> {
  const byCategory = new Map<QuizCategory, { sum: number; count: number }>();
  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) continue;
    const current = byCategory.get(question.categoryKey) ?? { sum: 0, count: 0 };
    current.sum += scoreMap[answer];
    current.count += 1;
    byCategory.set(question.categoryKey, current);
  }

  const result = {} as Record<QuizCategory, number>;
  for (const [category, values] of byCategory.entries()) {
    result[category] = Math.round((values.sum / (values.count * 4)) * 100);
  }
  return result;
}

export function computeTotalScore(categoryScores: Record<QuizCategory, number>) {
  const values = Object.values(categoryScores);
  if (!values.length) return 50;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function describeTotalScore(totalScore: number) {
  if (totalScore >= 56) return 'Aus deiner Sicht liegt derzeit ein größerer Teil der Verantwortung bei dir.';
  if (totalScore <= 44) return 'Aus deiner Sicht liegt derzeit ein größerer Teil der Verantwortung bei deinem Partner.';
  return 'Aus deiner Sicht ist die Verantwortung derzeit eher ausgeglichen verteilt.';
}

export function buildJointInsights(
  initiatorScores: Record<QuizCategory, number>,
  partnerScores: Record<QuizCategory, number>,
) {
  const sharedCategories = Object.keys(initiatorScores).filter((category) => partnerScores[category as QuizCategory] !== undefined) as QuizCategory[];
  const differences: Record<QuizCategory, number> = {} as Record<QuizCategory, number>;
  const insights: JointInsight[] = [];

  for (const category of sharedCategories) {
    const diff = Math.abs(initiatorScores[category] - partnerScores[category]);
    differences[category] = diff;

    const level = diff <= 12 ? 'small' : diff <= 25 ? 'medium' : 'high';
    const prefix = level === 'small'
      ? 'Ähnliche Wahrnehmung'
      : level === 'medium'
        ? 'Spürbarer Unterschied'
        : 'Deutlicher Abstimmungsbedarf';

    insights.push({
      level,
      category,
      difference: diff,
      text: `${prefix} bei ${categoryLabelMap[category]}.`,
    });
  }

  const avgDiff = sharedCategories.length
    ? Math.round(sharedCategories.reduce((sum, category) => sum + differences[category], 0) / sharedCategories.length)
    : 0;

  return {
    categoryDifferences: differences,
    insights: insights.sort((a, b) => b.difference - a.difference),
    averageDifference: avgDiff,
  };
}
