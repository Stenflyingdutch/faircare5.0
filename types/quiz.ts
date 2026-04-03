export type ChildCount = '1' | '2' | '3_plus';
export type AgeGroup = '0_1' | '1_3' | '3_6' | '6_12' | '12_18';

export type ChildcareTag = 'none' | 'kita' | 'tagesmutter' | 'family' | 'babysitter';
export type SplitClarity = 'eher_klar' | 'teils_spontan' | 'oft_unklar';

export type OwnershipAnswer = 'ich' | 'eher_ich' | 'beide' | 'eher_partner' | 'partner';

export type StressCategory =
  | 'organisation'
  | 'gesundheit'
  | 'betreuung_bildung'
  | 'grundversorgung'
  | 'haushalt_versorgung'
  | 'soziales';

export type QuizCategory = StressCategory | 'entwicklung';

export interface QuizFilterInput {
  childCount: ChildCount;
  youngestAgeGroup: AgeGroup;
  childcareTags: ChildcareTag[];
  splitClarity: SplitClarity;
}

export interface QuestionTemplate {
  id: string;
  text: string;
  category: QuizCategory;
  ageGroups: AgeGroup[];
  priority: number;
  isCore: boolean;
  requiredChildcareTags?: ChildcareTag[];
  excludedChildcareTags?: ChildcareTag[];
}

export interface TempQuizSession extends QuizFilterInput {
  tempSessionId: string;
  questionIds: string[];
  answers: Partial<Record<string, OwnershipAnswer>>;
  stressCategories: StressCategory[];
  sourcePlatform: 'web';
  createdAt: string;
  completedAt?: string;
  userId?: string;
  isAnonymousResultSaved?: boolean;
}

export interface QuizSummary {
  selfPercent: number;
  partnerPercent: number;
  topCategories: QuizCategory[];
  summaryText: string;
}

export interface CategoryInsight {
  category: QuizCategory;
  selfPercent: number;
  text: string;
}

export interface DetailedReport {
  summary: QuizSummary;
  categories: CategoryInsight[];
  createdAt: string;
}
