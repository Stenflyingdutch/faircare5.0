import type { IndividualResult, SharedResult } from '@/types/results';
import { nowIso } from '@/utils/date';

export const calculateSharedResults = (individualResults: IndividualResult[], sessionId: string, householdId: string): SharedResult => {
  const [a, b] = individualResults;
  const categoryDifferences = a.categoryScores.map((scoreA) => {
    const scoreB = b.categoryScores.find((s) => s.categoryId === scoreA.categoryId);
    return {
      categoryId: scoreA.categoryId,
      gap: Math.abs(scoreA.normalizedScore - (scoreB?.normalizedScore || 0)),
    };
  });

  const overallGapScore = categoryDifferences.reduce((sum, c) => sum + c.gap, 0) / Math.max(categoryDifferences.length, 1);

  return {
    sharedResultId: `${sessionId}_${householdId}`,
    sessionId,
    householdId,
    combinedSummary: overallGapScore > 0.3 ? 'Your load distribution shows meaningful imbalance between partners.' : 'Your load profile is fairly aligned this week.',
    categoryDifferences,
    overallGapScore,
    createdAt: nowIso(),
  };
};
