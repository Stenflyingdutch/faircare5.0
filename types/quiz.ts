import type { LocalizedText } from '@/types/i18n';

export type ChildCount = '1' | '2' | '3_plus';
export type AgeGroup = '0_1' | '1_3' | '3_6' | '6_10' | '10_plus';

export type ChildcareTag = 'none' | 'kita' | 'tagesmutter' | 'family' | 'babysitter';
export type SplitClarity = 'eher_klar' | 'teils_spontan' | 'oft_unklar';

export type OwnershipAnswer = 'ich' | 'eher_ich' | 'beide' | 'eher_partner' | 'partner';

export type StressCategory =
  | 'betreuung_entwicklung'
  | 'gesundheit'
  | 'babyalltag_pflege'
  | 'haushalt_einkaeufe_vorraete'
  | 'termine_planung_absprachen';

export type QuizCategory = StressCategory;

export interface QuizFilterInput {
  childCount: ChildCount;
  youngestAgeGroup: AgeGroup;
  childcareTags: ChildcareTag[];
  splitClarity: SplitClarity;
}

export interface QuizCategoryTemplate {
  key: QuizCategory;
  ageGroup: AgeGroup;
  label: LocalizedText;
  description: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

export interface QuestionTemplate {
  id: string;
  ageGroup: AgeGroup;
  categoryKey: QuizCategory;
  questionText: LocalizedText;
  sortOrder: number;
  isActive: boolean;
  requiredChildcareTags?: ChildcareTag[];
  excludedChildcareTags?: ChildcareTag[];
}

export interface QuizCatalog {
  categories: QuizCategoryTemplate[];
  questions: QuestionTemplate[];
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
