import { TASK_WEEKDAYS, compareDateKeys, differenceInMonths, formatDateLabel, getDaysInMonth, getWeekday, parseDateKey } from '@/services/task-date';
import type { TaskDelegationDocument, TaskDocument, TaskMonthlyPattern, TaskOverviewItem, TaskRecurrenceType, TaskWeekday } from '@/types/tasks';

function resolveAnchorDate(task: TaskDocument) {
  return task.selectedDate ?? task.createdAt.slice(0, 10);
}

function hasEnded(task: TaskDocument, dateKey: string) {
  return task.endMode === 'onDate' && Boolean(task.endDate) && compareDateKeys(dateKey, task.endDate!) > 0;
}

function matchesWeekdaySet(dateKey: string, weekdays?: TaskWeekday[] | null) {
  const activeWeekdays = weekdays?.length ? weekdays : TASK_WEEKDAYS;
  return activeWeekdays.includes(getWeekday(dateKey));
}

function matchesMonthlyPattern(dateKey: string, pattern: TaskMonthlyPattern) {
  const { year, month, day } = parseDateKey(dateKey);

  if (pattern.mode === 'dayOfMonth') {
    return day === pattern.dayOfMonth;
  }

  if (getWeekday(dateKey) !== pattern.weekday) {
    return false;
  }

  if (pattern.ordinal === -1) {
    return day + 7 > getDaysInMonth(year, month);
  }

  const occurrence = Math.ceil(day / 7);
  return occurrence === pattern.ordinal;
}

export function isTaskDueOnDate(task: TaskDocument, dateKey: string) {
  if (task.status !== 'active') return false;

  if (task.recurrenceType === 'none') {
    return Boolean(task.selectedDate) && task.selectedDate === dateKey;
  }

  const anchorDate = resolveAnchorDate(task);
  if (compareDateKeys(dateKey, anchorDate) < 0 || hasEnded(task, dateKey)) {
    return false;
  }

  switch (task.recurrenceType) {
    case 'daily':
      return matchesWeekdaySet(dateKey, task.recurrenceConfig?.weekdays);
    case 'weekly':
      return matchesWeekdaySet(dateKey, task.recurrenceConfig?.weekdays?.length
        ? task.recurrenceConfig.weekdays
        : [getWeekday(anchorDate)]);
    case 'monthly': {
      const pattern = task.recurrenceConfig?.monthlyPattern
        ?? { mode: 'dayOfMonth' as const, dayOfMonth: parseDateKey(anchorDate).day };
      return differenceInMonths(anchorDate, dateKey) >= 0 && matchesMonthlyPattern(dateKey, pattern);
    }
    case 'quarterly': {
      const monthDifference = differenceInMonths(anchorDate, dateKey);
      const pattern = task.recurrenceConfig?.quarterlyPattern
        ?? { mode: 'dayOfMonth' as const, dayOfMonth: parseDateKey(anchorDate).day };
      return monthDifference >= 0 && monthDifference % 3 === 0 && matchesMonthlyPattern(dateKey, pattern);
    }
    case 'yearly': {
      const anchor = parseDateKey(anchorDate);
      const target = parseDateKey(dateKey);
      const month = task.recurrenceConfig?.yearlyMonth ?? anchor.month;
      const day = task.recurrenceConfig?.yearlyDay ?? anchor.day;
      return target.year >= anchor.year && target.month === month && target.day === day;
    }
    default:
      return false;
  }
}

export function resolveAppliedDelegation(task: TaskDocument, delegations: TaskDelegationDocument[], dateKey: string) {
  const matchingSingleDate = delegations
    .filter((delegation) => delegation.mode === 'singleDate' && delegation.date === dateKey)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  if (matchingSingleDate) {
    return matchingSingleDate;
  }

  return delegations
    .filter((delegation) => delegation.mode === 'recurring' && matchesWeekdaySet(dateKey, delegation.weekdays))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

export function toTaskOverviewItem(task: TaskDocument, delegations: TaskDelegationDocument[], dateKey: string): TaskOverviewItem {
  const appliedDelegation = resolveAppliedDelegation(task, delegations, dateKey);

  return {
    ...task,
    delegations,
    isDueOnSelectedDate: isTaskDueOnDate(task, dateKey),
    isDelegated: Boolean(appliedDelegation),
    appliedDelegationMode: appliedDelegation?.mode ?? null,
    effectiveAssignedToUserId: appliedDelegation?.delegatedToUserId ?? task.assignedToUserId,
  };
}

export function getRecurrenceLabel(recurrenceType: TaskRecurrenceType) {
  switch (recurrenceType) {
    case 'daily':
      return 'Täglich';
    case 'weekly':
      return 'Wöchentlich';
    case 'monthly':
      return 'Monatlich';
    case 'quarterly':
      return 'Quartalsweise';
    case 'yearly':
      return 'Jährlich';
    default:
      return 'Einmalig';
  }
}

export function getTaskTimingLabel(task: Pick<TaskDocument, 'recurrenceType' | 'selectedDate'>) {
  if (task.recurrenceType !== 'none') {
    return getRecurrenceLabel(task.recurrenceType);
  }

  if (task.selectedDate) {
    return `Einmalig am ${formatDateLabel(task.selectedDate)}`;
  }

  return 'Ohne Termin';
}
