import type { QuizCategory } from '@/types/quiz';
import type { TaskThreadListItem } from '@/types/task-chat';

export type TaskType = 'responsibilityTask' | 'dayTask';
export type TaskStatus = 'active' | 'completed';
export type TaskRecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type TaskEndMode = 'never' | 'onDate';
export type TaskWeekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type TaskOrdinal = 1 | 2 | 3 | 4 | -1;
export type TaskMonthlyPatternMode = 'dayOfMonth' | 'weekdayOfMonth';
export type TaskDelegationMode = 'singleDate' | 'recurring';
export type TaskDelegationRecurringStrategy = 'always' | 'alternating';

export interface TaskMonthlyPatternByDay {
  mode: 'dayOfMonth';
  dayOfMonth: number;
}

export interface TaskMonthlyPatternByWeekday {
  mode: 'weekdayOfMonth';
  ordinal: TaskOrdinal;
  weekday: TaskWeekday;
}

export type TaskMonthlyPattern = TaskMonthlyPatternByDay | TaskMonthlyPatternByWeekday;

export interface TaskRecurrenceConfig {
  weekdays?: TaskWeekday[];
  monthlyPattern?: TaskMonthlyPattern;
  quarterlyPattern?: TaskMonthlyPattern;
  yearlyMonth?: number;
  yearlyDay?: number;
}

export interface TaskDocument {
  id: string;
  familyId: string;
  responsibilityId?: string | null;
  categoryKey?: QuizCategory | null;
  title: string;
  notes?: string | null;
  creatorUserId?: string;
  createdByUserId: string;
  assignedToUserId: string;
  ownerUserId?: string | null;
  delegatedToUserId?: string | null;
  delegatedByUserId?: string | null;
  delegatedAt?: string | null;
  visibilityMode?: 'private' | 'delegated';
  visibleToUserIds?: string[];
  taskType: TaskType;
  selectedDate?: string | null;
  recurrenceType: TaskRecurrenceType;
  recurrenceConfig?: TaskRecurrenceConfig | null;
  endMode: TaskEndMode;
  endDate?: string | null;
  status: TaskStatus;
  threadId?: string | null;
  unreadForUserIds?: string[];
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  source?: 'manual' | 'system';
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDelegationDocument {
  id: string;
  taskId: string;
  familyId: string;
  delegatedByUserId: string;
  delegatedToUserId: string;
  mode: TaskDelegationMode;
  date?: string | null;
  weekdays?: TaskWeekday[] | null;
  recurringStrategy?: TaskDelegationRecurringStrategy | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskOverrideDocument {
  id: string;
  taskId: string;
  familyId: string;
  date: string;
  title?: string | null;
  notes?: string | null;
  status?: TaskStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskOverviewItem extends TaskDocument {
  delegations: TaskDelegationDocument[];
  overrides: TaskOverrideDocument[];
  displayTitle: string;
  displayNotes: string | null;
  isDueOnSelectedDate: boolean;
  nextOccurrenceDate: string | null;
  resolvedStatus: TaskStatus;
  isCompleted: boolean;
  isDelegated: boolean;
  appliedDelegationMode: TaskDelegationMode | null;
  effectiveAssignedToUserId: string;
}

export interface TaskOverviewResponse {
  selectedDate: string;
  dayTasks: TaskOverviewItem[];
  responsibilityTasks: TaskOverviewItem[];
  tasks?: TaskOverviewItem[];
  responsibilities?: TaskOverviewItem[];
  taskThreads?: TaskThreadListItem[];
  inbox?: TaskThreadListItem[];
  warnings?: string[];
  taskThreadMetaByTaskId?: Record<string, TaskThreadOverviewMeta>;
  unreadChatCount?: number;
}

export interface TaskThreadOverviewMeta {
  threadId: string;
  unreadCount: number;
  hasThread: boolean;
}

export interface CreateTaskInput {
  taskType: TaskType;
  responsibilityId?: string | null;
  categoryKey?: QuizCategory | null;
  title: string;
  notes?: string | null;
  selectedDate?: string | null;
  recurrenceType?: TaskRecurrenceType;
  recurrenceConfig?: TaskRecurrenceConfig | null;
  endMode?: TaskEndMode;
  endDate?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  selectedDate?: string | null;
  recurrenceType?: TaskRecurrenceType;
  recurrenceConfig?: TaskRecurrenceConfig | null;
  endMode?: TaskEndMode;
  endDate?: string | null;
  status?: TaskStatus;
}

export interface SaveTaskDelegationInput {
  mode: TaskDelegationMode;
  date?: string | null;
  weekdays?: TaskWeekday[] | null;
  recurringStrategy?: TaskDelegationRecurringStrategy | null;
}

export interface UpdateTaskInstanceInput {
  title?: string;
  notes?: string | null;
  status?: TaskStatus;
}
