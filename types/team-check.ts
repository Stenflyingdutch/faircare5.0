import type { QuizCategory } from '@/types/quiz';

export type TeamCheckFrequency = 'weekly' | 'biweekly' | 'monthly';
export type TeamCheckActionType = 'discuss' | 'handover' | 'swap';

export interface TeamCheckPlan {
  frequency: TeamCheckFrequency;
  dayOfWeek: number;
  time?: string | null;
  nextCheckInAt: string;
  lastCheckInAt?: string | null;
  reminderActiveAt: string;
  updatedAt?: string;
  updatedBy: string;
  createdAt: string;
}

export interface TeamCheckUserPreferences {
  teamCheckEmailReminderEnabled?: boolean;
}

export interface TeamCheckPreparation {
  id: string;
  familyId: string;
  userId: string;
  scheduledForKey: string;
  goodMoments: string;
  changeWishes?: string;
  handoverAreaCategoryKeys: QuizCategory[];
  swapAreaCategoryKeys: QuizCategory[];
  selectedTaskActions: Array<{
    cardId: string;
    action: TeamCheckActionType;
  }>;
  saved: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface TeamCheckRecord {
  id: string;
  familyId: string;
  scheduledForKey: string;
  checkInAt: string;
  preparationSnapshot: TeamCheckPreparation[];
  discussedCardIds: string[];
  discussedCategoryKeys: QuizCategory[];
  assignmentChanges: Array<{
    cardId: string;
    fromOwnerUserId: string | null;
    toOwnerUserId: string | null;
  }>;
  snapshotBeforeCards: Array<{
    cardId: string;
    title: string;
    categoryKey: QuizCategory;
    ownerUserId: string | null;
    focusLevel?: string | null;
    isActive?: boolean;
  }>;
  note?: string;
  createdBy: string;
  createdAt: string;
}
