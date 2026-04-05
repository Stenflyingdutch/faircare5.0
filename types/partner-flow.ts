import type { OwnershipAnswer, QuestionTemplate, QuizCategory, StressSelection } from '@/types/quiz';

export type FamilyStatus = 'invited' | 'partner_completed' | 'joint_pending' | 'joint_active';
export type InvitationStatus = 'sent' | 'accepted' | 'expired';
export type JointResultStatus = 'pending_activation' | 'active';
export type FamilyRole = 'initiator' | 'partner';

export interface AppUserProfile {
  id: string;
  email: string;
  displayName?: string;
  familyId?: string | null;
  role?: FamilyRole;
  createdAt?: string;
}

export interface FamilyDocument {
  id: string;
  initiatorUserId: string;
  partnerUserId?: string | null;
  status: FamilyStatus;
  initiatorCompleted?: boolean;
  partnerCompleted?: boolean;
  initiatorRegistered?: boolean;
  partnerRegistered?: boolean;
  resultsUnlocked?: boolean;
  sharedResultsOpened?: boolean;
  unlockedAt?: string | null;
  unlockedBy?: string | null;
  sharedResultsOpenedAt?: string | null;
  sharedResultsOpenedBy?: string | null;
  invitationId?: string | null;
  createdAt: string;
  activatedAt?: string | null;
}

export interface InvitationDocument {
  id: string;
  familyId: string;
  initiatorUserId: string;
  partnerEmail: string;
  personalMessage?: string | null;
  tokenHash: string;
  status: InvitationStatus;
  sentAt: string;
  acceptedAt?: string | null;
  expiresAt: string;
  questionSetId: string;
  questionSetSnapshot: QuestionTemplate[];
}

export interface QuizSessionDocument {
  id: string;
  familyId: string;
  userId?: string | null;
  role: FamilyRole;
  source: 'initiator' | 'partner';
  questionSetId: string;
  questionSetSnapshot: QuestionTemplate[];
  filterAnswers?: Record<string, string> | null;
  stressCategories?: StressSelection[];
  answers: Partial<Record<string, OwnershipAnswer>>;
  createdAt: string;
  completedAt?: string | null;
}

export interface QuizResultDocument {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  answers: Partial<Record<string, OwnershipAnswer>>;
  categoryScores: Record<QuizCategory, number>;
  totalScore: number;
  interpretation: string;
  filterPerceptionAnswer?: string | null;
  stressCategories?: StressSelection[];
  completedAt: string;
  createdAt?: string;
  questionSetSnapshot: QuestionTemplate[];
}

export interface JointInsight {
  level: 'small' | 'medium' | 'high';
  category: QuizCategory;
  text: string;
  difference: number;
}

export interface JointResultDocument {
  id: string;
  familyId: string;
  initiatorResultId: string;
  partnerResultId: string;
  comparison: {
    initiatorTotal: number;
    partnerTotal: number;
    averageDifference: number;
  };
  categoryDifferences: Record<QuizCategory, number>;
  insights: JointInsight[];
  status: JointResultStatus;
  createdAt: string;
  activatedAt?: string | null;
  updatedAt?: string;
}
