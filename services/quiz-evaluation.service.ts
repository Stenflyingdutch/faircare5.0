import type { OwnershipAnswer, QuizQuestion, QuizSummary, StressCategory } from '@/types/quiz';

const scoreMap: Record<OwnershipAnswer, number> = {
  ich: 4,
  eher_ich: 3,
  beide: 2,
  eher_partner: 1,
  partner: 0,
};

const categoryLabels: Record<StressCategory, string> = {
  organisation: 'Organisation',
  gesundheit: 'Gesundheit',
  betreuung_bildung: 'Betreuung & Bildung',
  grundversorgung: 'Grundversorgung',
  haushalt_versorgung: 'Haushalt & Versorgung',
  soziales: 'Soziales',
};

export function getStressCategoryLabel(category: StressCategory) {
  return categoryLabels[category];
}

export function evaluateQuiz(
  questions: QuizQuestion[],
  answers: Partial<Record<string, OwnershipAnswer>>,
): QuizSummary {
  const answeredQuestions = questions.filter((question) => answers[question.id]);
  const totalScore = answeredQuestions.reduce((sum, question) => sum + scoreMap[answers[question.id] as OwnershipAnswer], 0);
  const maxScore = answeredQuestions.length * 4;

  const mePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;
  const partnerPercent = 100 - mePercent;

  const categoryAverages = new Map<StressCategory, { sum: number; count: number }>();
  for (const question of answeredQuestions) {
    const answer = answers[question.id];
    if (!answer) continue;

    const bucket = categoryAverages.get(question.category) ?? { sum: 0, count: 0 };
    bucket.sum += scoreMap[answer];
    bucket.count += 1;
    categoryAverages.set(question.category, bucket);
  }

  const topCategories = [...categoryAverages.entries()]
    .sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)
    .slice(0, 3)
    .map(([category]) => category);

  const summaryText =
    mePercent >= 55
      ? 'Aus deiner Sicht liegt aktuell ein größerer Teil der Verantwortung bei dir.'
      : mePercent <= 45
        ? 'Aus deiner Sicht liegt aktuell ein größerer Teil der Verantwortung beim Partner.'
        : 'Aus deiner Sicht ist die Verantwortung aktuell eher ausgeglichen verteilt.';

  return {
    mePercent,
    partnerPercent,
    topCategories,
    summaryText,
  };
}
