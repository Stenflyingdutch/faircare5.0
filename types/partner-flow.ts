import type { UserAccountStatus, UserRole } from '@/types/domain';
import type { OwnershipAnswer, QuestionTemplate, QuizCategory, StressSelection } from '@/types/quiz';
import type { TeamCheckPlan } from '@/types/team-check';

export type FamilyStatus = 'invited' | 'partner_completed' | 'joint_pending' | 'joint_active';
export type InvitationStatus = 'sent' | 'accepted' | 'expired' | 'revoked';
export type JointResultStatus = 'pending_activation' | 'active';
export type FamilyRole = 'initiator' | 'partner';
export type InvitationResolutionStatus = 'valid' | 'accepted' | 'expired' | 'invalid' | 'error';
export type InvitationResolutionReason =
  | 'missing_token'
  | 'invite_not_found'
  | 'invite_expired'
  | 'invite_revoked'
  | 'invite_already_completed'
  | 'lookup_failed'
  | 'invalid_route_params'
  | 'premature_invalid_state';

export interface AppUserProfile {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  familyId?: string | null;
  role?: FamilyRole;
  adminRole?: UserRole;
  isSuperuser?: boolean;
  accountStatus?: UserAccountStatus;
  teamCheckEmailReminderEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}

export interface FamilyDocument {
  id: string;
  initiatorUserId: string;
  partnerUserId?: string | null;
  initiatorDisplayName?: string | null;
  partnerDisplayName?: string | null;
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
  resultsDiscussedAt?: string | null;
  resultsDiscussedBy?: string | null;
  invitationId?: string | null;
  teamCheckPlan?: TeamCheckPlan;
  createdAt: string;
  activatedAt?: string | null;
}

export interface InvitationDocument {
  id: string;
  familyId: string;
  initiatorUserId: string;
  initiatorDisplayName?: string | null;
  partnerEmail: string;
  personalMessage?: string | null;
  token?: string | null;
  tokenHash?: string | null;
  status: InvitationStatus;
  sentAt: string;
  acceptedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  questionSetId?: string | null;
  questionIds?: string[];
  questionSetSnapshot?: QuestionTemplate[];
}

export type InvitationResolution =
  | {
    status: 'valid';
    reason: null;
    invitation: InvitationDocument;
  }
  | {
    status: 'accepted';
    reason: 'invite_already_completed';
    invitation: InvitationDocument;
  }
  | {
    status: 'expired';
    reason: 'invite_expired';
    invitation: InvitationDocument;
  }
  | {
    status: 'invalid';
    reason: Exclude<InvitationResolutionReason, 'invite_already_completed' | 'invite_expired' | 'lookup_failed'>;
    invitation?: InvitationDocument;
  }
  | {
    status: 'error';
    reason: 'lookup_failed';
    errorMessage?: string;
  };

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
