import type { AgeGroup, ChildcareTag, QuizCategory, StressSelection } from '@/types/quiz';
import type { Locale, LocalizedText, LocalizedTextList } from '@/types/i18n';

export type OwnershipFocusLevel = 'now' | 'soon' | 'later';
export type ResponsibilityPriority = 'act' | 'plan' | 'observe';
export type ResponsibilityOwner = 'user' | 'partner';
export type RecommendationReasonCode = 'high_test_load' | 'high_perceived_stress' | 'different_perception';

export interface TaskPackageTemplate {
  id: string;
  ageGroup: AgeGroup;
  categoryKey: QuizCategory;
  filterTags?: string[];
  requiredChildcareTags?: ChildcareTag[];
  title: LocalizedText;
  details: LocalizedTextList;
  note: LocalizedText;
  sortOrder: number;
  isActive: boolean;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OwnershipCategoryDocument {
  categoryKey: QuizCategory;
  isRecommended: boolean;
  recommendationRank: number | null;
  relevanceScore: number;
  reasonCodes: RecommendationReasonCode[];
  activatedAt?: string;
  updatedAt?: string;
}

export interface OwnershipCardDocument {
  id: string;
  categoryKey: QuizCategory;
  sourceTemplateId?: string | null;
  title: string;
  note: string;
  ownerUserId?: string | null;
  focusLevel?: OwnershipFocusLevel | null;
  priority?: ResponsibilityPriority | null;
  assignedTo?: ResponsibilityOwner | null;
  isActive?: boolean;
  sortOrder: number;
  isDeleted: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OwnershipRecommendation {
  categoryKey: QuizCategory;
  relevanceScore: number;
  reasonCodes: RecommendationReasonCode[];
  reasonText: string;
}

export interface OwnershipComputationInput {
  categoryScores: Record<QuizCategory, number>;
  stressCategories?: StressSelection[];
  partnerCategoryScores?: Partial<Record<QuizCategory, number>>;
}

export interface OwnershipSignalBreakdown {
  categoryKey: QuizCategory;
  testLoadScore: number;
  perceivedStressScore: number;
  differenceScore: number;
  relevanceScore: number;
  reasonCodes: RecommendationReasonCode[];
}

export interface OwnershipTemplateTranslation {
  locale: Locale;
  title: string;
  details: string[];
  note: string;
}
