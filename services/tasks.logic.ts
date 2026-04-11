import {
  TASK_WEEKDAYS,
  addDays,
  compareDateKeys,
  differenceInMonths,
  formatDateLabel,
  formatMonthDayLabel,
  formatTaskWeekday,
  getDaysInMonth,
  getWeekday,
  parseDateKey,
} from '@/services/task-date';
import type {
  TaskDelegationDocument,
  TaskDocument,
  TaskMonthlyPattern,
  TaskOverviewItem,
  TaskOverrideDocument,
  TaskRecurrenceType,
  TaskStatus,
  TaskWeekday,
} from '@/types/tasks';

type TaskWithInstanceCollections = Pick<
  TaskDocument,
  'assignedToUserId' | 'createdAt' | 'endDate' | 'endMode' | 'notes' | 'recurrenceConfig' | 'recurrenceType' | 'selectedDate' | 'status' | 'title'
> & {
  delegations?: TaskDelegationDocument[];
  overrides?: TaskOverrideDocument[];
};

const ordinalLabels: Record<-1 | 1 | 2 | 3 | 4, string> = {
  1: 'ersten',
  2: 'zweiten',
  3: 'dritten',
  4: 'vierten',
  [-1]: 'letzten',
};

function resolveAnchorDate(task: Pick<TaskDocument, 'createdAt' | 'selectedDate'>) {
  return task.selectedDate ?? task.createdAt.slice(0, 10);
}

function hasEnded(task: Pick<TaskDocument, 'endDate' | 'endMode'>, dateKey: string) {
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

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`;
}

function formatWeekdaySequence(weekdays: TaskWeekday[], locale = 'de-DE', format: 'long' | 'short' = 'long') {
  const uniqueWeekdays = weekdays.length ? weekdays : TASK_WEEKDAYS;
  return joinList(uniqueWeekdays.map((weekday) => formatTaskWeekday(weekday, locale, format)));
}

function resolvePatternAnchor(task: Pick<TaskDocument, 'createdAt' | 'recurrenceConfig' | 'selectedDate'>) {
  return parseDateKey(resolveAnchorDate(task));
}

function getMonthlyPatternLabel(
  prefix: 'Monatlich' | 'Quartalsweise',
  pattern: TaskMonthlyPattern,
  locale = 'de-DE',
) {
  if (pattern.mode === 'dayOfMonth') {
    return `${prefix} am ${pattern.dayOfMonth}.`;
  }

  return `${prefix} am ${ordinalLabels[pattern.ordinal]} ${formatTaskWeekday(pattern.weekday, locale)}`;
}

function getRecurringPatternLabel(
  task: Pick<TaskDocument, 'createdAt' | 'recurrenceConfig' | 'recurrenceType' | 'selectedDate'>,
  locale = 'de-DE',
) {
  const anchor = resolvePatternAnchor(task);

  switch (task.recurrenceType) {
    case 'daily': {
      const weekdays = task.recurrenceConfig?.weekdays?.length
        ? task.recurrenceConfig.weekdays
        : TASK_WEEKDAYS;
      return weekdays.length === TASK_WEEKDAYS.length
        ? 'Täglich'
        : `Täglich am ${formatWeekdaySequence(weekdays, locale)}`;
    }
    case 'weekly': {
      const weekdays = task.recurrenceConfig?.weekdays?.length
        ? task.recurrenceConfig.weekdays
        : [getWeekday(resolveAnchorDate(task))];
      return `Wöchentlich am ${formatWeekdaySequence(weekdays, locale)}`;
    }
    case 'monthly': {
      const pattern = task.recurrenceConfig?.monthlyPattern
        ?? { mode: 'dayOfMonth' as const, dayOfMonth: anchor.day };
      return getMonthlyPatternLabel('Monatlich', pattern, locale);
    }
    case 'quarterly': {
      const pattern = task.recurrenceConfig?.quarterlyPattern
        ?? { mode: 'dayOfMonth' as const, dayOfMonth: anchor.day };
      return getMonthlyPatternLabel('Quartalsweise', pattern, locale);
    }
    case 'yearly': {
      const month = task.recurrenceConfig?.yearlyMonth ?? anchor.month;
      const day = task.recurrenceConfig?.yearlyDay ?? anchor.day;
      return `Jährlich am ${formatMonthDayLabel(month, day, locale)}`;
    }
    default:
      return 'Einmalig';
  }
}

export function isTaskDueOnDate(task: Pick<TaskDocument, 'createdAt' | 'endDate' | 'endMode' | 'recurrenceConfig' | 'recurrenceType' | 'selectedDate'>, dateKey: string) {
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
      const target = parseDateKey(dateKey);
      const month = task.recurrenceConfig?.yearlyMonth ?? parseDateKey(anchorDate).month;
      const day = task.recurrenceConfig?.yearlyDay ?? parseDateKey(anchorDate).day;
      return target.month === month && target.day === day;
    }
    default:
      return false;
  }
}

export function findNextTaskOccurrence(task: Pick<TaskDocument, 'createdAt' | 'endDate' | 'endMode' | 'recurrenceConfig' | 'recurrenceType' | 'selectedDate'>, fromDate: string) {
  if (task.recurrenceType === 'none') {
    return task.selectedDate && compareDateKeys(task.selectedDate, fromDate) >= 0 ? task.selectedDate : null;
  }

  const anchorDate = resolveAnchorDate(task);
  let probeDate = compareDateKeys(fromDate, anchorDate) < 0 ? anchorDate : fromDate;
  const finalDate = task.endMode === 'onDate' && task.endDate
    ? task.endDate
    : addDays(probeDate, 400);

  while (compareDateKeys(probeDate, finalDate) <= 0) {
    if (isTaskDueOnDate(task, probeDate)) {
      return probeDate;
    }
    probeDate = addDays(probeDate, 1);
  }

  return null;
}

export function resolveAppliedOverride(overrides: TaskOverrideDocument[], dateKey: string) {
  return sortByUpdatedAtDesc(overrides.filter((override) => override.date === dateKey))[0] ?? null;
}

export function resolveAppliedDelegation(delegations: TaskDelegationDocument[], dateKey: string) {
  const matchingSingleDate = sortByUpdatedAtDesc(
    delegations.filter((delegation) => delegation.mode === 'singleDate' && delegation.date === dateKey),
  )[0];

  if (matchingSingleDate) {
    return matchingSingleDate;
  }

  return sortByUpdatedAtDesc(
    delegations.filter((delegation) => delegation.mode === 'recurring' && matchesWeekdaySet(dateKey, delegation.weekdays)),
  )[0] ?? null;
}

export function resolveTaskInstanceState(task: TaskWithInstanceCollections, dateKey: string) {
  const appliedOverride = resolveAppliedOverride(task.overrides ?? [], dateKey);
  const appliedDelegation = resolveAppliedDelegation(task.delegations ?? [], dateKey);
  const resolvedStatus: TaskStatus = appliedOverride?.status ?? task.status;

  return {
    appliedDelegation,
    appliedOverride,
    displayNotes: appliedOverride?.notes ?? task.notes ?? null,
    displayTitle: appliedOverride?.title ?? task.title,
    effectiveAssignedToUserId: appliedDelegation?.delegatedToUserId ?? task.assignedToUserId,
    isCompleted: resolvedStatus === 'completed',
    isDelegated: Boolean(appliedDelegation),
    resolvedStatus,
  };
}

export function resolveTaskInstanceDate(task: TaskOverviewItem, selectedDate: string) {
  if (task.recurrenceType === 'none') {
    return task.selectedDate ?? selectedDate;
  }

  if (task.isDueOnSelectedDate) {
    return selectedDate;
  }

  return task.nextOccurrenceDate;
}

export function toTaskOverviewItem(
  task: TaskDocument,
  delegations: TaskDelegationDocument[],
  overrides: TaskOverrideDocument[],
  dateKey: string,
): TaskOverviewItem {
  const instanceState = resolveTaskInstanceState({ ...task, delegations, overrides }, dateKey);

  return {
    ...task,
    delegations,
    overrides,
    displayNotes: instanceState.displayNotes,
    displayTitle: instanceState.displayTitle,
    isCompleted: instanceState.isCompleted,
    isDelegated: instanceState.isDelegated,
    isDueOnSelectedDate: isTaskDueOnDate(task, dateKey),
    nextOccurrenceDate: findNextTaskOccurrence(task, dateKey),
    resolvedStatus: instanceState.resolvedStatus,
    appliedDelegationMode: instanceState.appliedDelegation?.mode ?? null,
    effectiveAssignedToUserId: instanceState.effectiveAssignedToUserId,
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

export function getTaskTimingLabel(
  task: Pick<TaskDocument, 'createdAt' | 'recurrenceConfig' | 'recurrenceType' | 'selectedDate'>,
  locale = 'de-DE',
) {
  if (task.recurrenceType !== 'none') {
    return getRecurringPatternLabel(task, locale);
  }

  if (task.selectedDate) {
    return `Einmalig am ${formatDateLabel(task.selectedDate, locale)}`;
  }

  return 'Ohne Termin';
}
