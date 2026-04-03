export type QuizSessionStatus = 'active' | 'completed';

export interface QuizSession {
  sessionId: string;
  householdId: string;
  status: QuizSessionStatus;
  createdAt: string;
  completedAt?: string;
}

export interface QuizAnswer {
  answerId: string;
  sessionId: string;
  userId: string;
  questionId: string;
  categoryId: string;
  answerValue: number;
  scoreValue: number;
  createdAt: string;
}
