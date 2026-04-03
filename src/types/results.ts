export interface CategoryScore {
  categoryId: string;
  categoryName: string;
  totalScore: number;
  normalizedScore: number;
  interpretation: 'low' | 'medium' | 'high';
}

export interface QuestionBreakdownItem {
  questionId: string;
  categoryId: string;
  questionText: string;
  selectedAnswer: number;
  scoreValue: number;
  interpretation?: string;
}

export interface ResultInsight {
  title: string;
  description: string;
  severity: 'positive' | 'neutral' | 'attention';
}

export interface IndividualResult {
  resultId: string;
  sessionId: string;
  userId: string;
  totalScore: number;
  categoryScores: CategoryScore[];
  topStressAreas: ResultInsight[];
  topBalancedAreas: ResultInsight[];
  interpretedSummary: string;
  questionBreakdown: QuestionBreakdownItem[];
  createdAt: string;
}

export interface SharedResult {
  sharedResultId: string;
  sessionId: string;
  householdId: string;
  combinedSummary: string;
  categoryDifferences: Array<{
    categoryId: string;
    gap: number;
  }>;
  overallGapScore: number;
  createdAt: string;
}
