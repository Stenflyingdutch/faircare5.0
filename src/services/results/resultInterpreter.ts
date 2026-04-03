import type { CategoryScore, IndividualResult, ResultInsight } from '@/types/results';
import { RESULT_THRESHOLDS } from '@/constants/resultThresholds';

export const interpretCategoryScore = (categoryScore: CategoryScore) => {
  if (categoryScore.normalizedScore <= RESULT_THRESHOLDS.LOW) return 'low';
  if (categoryScore.normalizedScore <= RESULT_THRESHOLDS.MEDIUM) return 'medium';
  return 'high';
};

export const getTopStressAreas = (result: IndividualResult): ResultInsight[] =>
  [...result.categoryScores]
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 3)
    .map((c) => ({
      title: c.categoryName,
      description: `Higher relative load in ${c.categoryName.toLowerCase()}.`,
      severity: 'attention',
    }));

export const getTopBalancedAreas = (result: IndividualResult): ResultInsight[] =>
  [...result.categoryScores]
    .sort((a, b) => a.normalizedScore - b.normalizedScore)
    .slice(0, 3)
    .map((c) => ({
      title: c.categoryName,
      description: `${c.categoryName} appears more balanced and sustainable.`,
      severity: 'positive',
    }));

export const interpretIndividualResults = (result: IndividualResult) => {
  const highCount = result.categoryScores.filter((c) => c.interpretation === 'high').length;
  if (highCount >= 3) return 'Your responses indicate a heavier and broad mental-load strain this week.';
  if (highCount >= 1) return 'You are managing well overall, with a few concentrated stress pockets.';
  return 'Your current pattern suggests a relatively balanced load distribution.';
};
