import { QUIZ_CATEGORIES } from '@/constants/quizCategories';
import type { IndividualResult, CategoryScore, QuestionBreakdownItem } from '@/types/results';
import type { QuizAnswer } from '@/types/quiz';
import { getTopBalancedAreas, getTopStressAreas, interpretCategoryScore, interpretIndividualResults } from './resultInterpreter';
import { nowIso } from '@/utils/date';

export const calculateIndividualResults = (
  answers: QuizAnswer[],
  questionMap: Record<string, { text: string; categoryId: string }>,
  sessionId: string,
  userId: string,
): IndividualResult => {
  const totalScore = answers.reduce((sum, a) => sum + a.scoreValue, 0);
  const byCategory = answers.reduce<Record<string, QuizAnswer[]>>((acc, answer) => {
    acc[answer.categoryId] = [...(acc[answer.categoryId] || []), answer];
    return acc;
  }, {});

  const categoryScores: CategoryScore[] = QUIZ_CATEGORIES.map((c) => {
    const categoryAnswers = byCategory[c.id] || [];
    const categoryTotal = categoryAnswers.reduce((sum, a) => sum + a.scoreValue, 0);
    const normalized = categoryAnswers.length ? categoryTotal / (categoryAnswers.length * 5) : 0;
    const item: CategoryScore = {
      categoryId: c.id,
      categoryName: c.label,
      totalScore: categoryTotal,
      normalizedScore: normalized,
      interpretation: 'low',
    };
    return { ...item, interpretation: interpretCategoryScore(item) };
  });

  const questionBreakdown: QuestionBreakdownItem[] = answers.map((a) => ({
    questionId: a.questionId,
    categoryId: a.categoryId,
    questionText: questionMap[a.questionId]?.text || a.questionId,
    selectedAnswer: a.answerValue,
    scoreValue: a.scoreValue,
    interpretation: a.scoreValue >= 4 ? 'Elevated strain reported' : 'Within a manageable range',
  }));

  const baseResult: IndividualResult = {
    resultId: `${sessionId}_${userId}`,
    sessionId,
    userId,
    totalScore,
    categoryScores,
    topStressAreas: [],
    topBalancedAreas: [],
    interpretedSummary: '',
    questionBreakdown,
    createdAt: nowIso(),
  };

  const completeResult: IndividualResult = {
    ...baseResult,
    topStressAreas: getTopStressAreas(baseResult),
    topBalancedAreas: getTopBalancedAreas(baseResult),
    interpretedSummary: interpretIndividualResults(baseResult),
  };

  return completeResult;
};
