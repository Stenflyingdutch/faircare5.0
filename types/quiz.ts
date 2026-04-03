export type YoungestAgeGroup = '0-1' | '1-3' | '3-6' | '6-12' | '12-18';

export type ChildcareTag = 'none' | 'kita' | 'tagesmutter' | 'familie' | 'babysitter';

export type SplitClarity = 'clear' | 'mixed' | 'unclear';

export type OwnershipAnswer = 'ich' | 'eher_ich' | 'beide' | 'eher_partner' | 'partner';

export type StressCategory =
  | 'organisation'
  | 'gesundheit'
  | 'betreuung_bildung'
  | 'grundversorgung'
  | 'haushalt_versorgung'
  | 'soziales';

export interface QuizFilterInput {
  childCount: '1' | '2' | '3+';
  youngestAgeGroup: YoungestAgeGroup;
  childcareTags: ChildcareTag[];
  splitClarity: SplitClarity;
}

export interface QuizQuestion {
  id: string;
  text: string;
  category: StressCategory;
  isCore: boolean;
  requiredChildcareTag?: Extract<ChildcareTag, 'familie' | 'babysitter'>;
}

export interface TempQuizSession extends QuizFilterInput {
  tempSessionId: string;
  questionIds: string[];
  answers: Partial<Record<string, OwnershipAnswer>>;
  stressCategories: StressCategory[];
  sourcePlatform: 'web';
  createdAt: string;
  completedAt?: string;
}

export interface QuizSummary {
  mePercent: number;
  partnerPercent: number;
  topCategories: StressCategory[];
  summaryText: string;
}
