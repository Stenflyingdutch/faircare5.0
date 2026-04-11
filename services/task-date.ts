import type { TaskWeekday } from '@/types/tasks';

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const TASK_WEEKDAYS: TaskWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function assertDateKey(value: string) {
  if (!DATE_KEY_REGEX.test(value)) {
    throw new Error('Ungültiges Datumsformat. Erwartet wird YYYY-MM-DD.');
  }
}

export function parseDateKey(value: string) {
  assertDateKey(value);
  const [year, month, day] = value.split('-').map((entry) => Number(entry));
  return { year, month, day };
}

export function fromUtcDate(date: Date) {
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0'),
  ].join('-');
}

export function toUtcDate(value: string) {
  const { year, month, day } = parseDateKey(value);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right);
}

export function addDays(value: string, amount: number) {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromUtcDate(date);
}

export function startOfWeek(value: string) {
  const date = toUtcDate(value);
  const weekdayIndex = (date.getUTCDay() + 6) % 7;
  return addDays(value, -weekdayIndex);
}

export function buildWeek(value: string) {
  const weekStart = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function getWeekday(value: string): TaskWeekday {
  const weekdayIndex = (toUtcDate(value).getUTCDay() + 6) % 7;
  return TASK_WEEKDAYS[weekdayIndex];
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
}

export function differenceInMonths(anchorDate: string, targetDate: string) {
  const anchor = parseDateKey(anchorDate);
  const target = parseDateKey(targetDate);
  return (target.year - anchor.year) * 12 + (target.month - anchor.month);
}

export function formatDateLabel(value: string, locale = 'de-DE') {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toUtcDate(value));
}

export function formatStripDate(value: string, locale = 'de-DE') {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcDate(value));
}

export function formatWeekdayLabel(value: string, locale = 'de-DE') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  }).format(toUtcDate(value));
}

export function formatTaskWeekday(weekday: TaskWeekday, locale = 'de-DE', format: 'long' | 'short' = 'long') {
  const referenceByWeekday: Record<TaskWeekday, string> = {
    mon: '2024-01-01',
    tue: '2024-01-02',
    wed: '2024-01-03',
    thu: '2024-01-04',
    fri: '2024-01-05',
    sat: '2024-01-06',
    sun: '2024-01-07',
  };

  return new Intl.DateTimeFormat(locale, {
    weekday: format,
    timeZone: 'UTC',
  }).format(toUtcDate(referenceByWeekday[weekday]));
}

export function formatMonthDayLabel(month: number, day: number, locale = 'de-DE') {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2024, month - 1, day, 12, 0, 0)));
}

export function formatWeekRange(startDate: string, endDate: string, locale = 'de-DE') {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  const startDay = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format(start);
  const endDay = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format(end);
  const startMonth = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(start);
  const endMonth = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(end);

  if (startMonth === endMonth) {
    return `${startDay}.–${endDay}. ${endMonth}`;
  }

  return `${startDay}. ${startMonth}–${endDay}. ${endMonth}`;
}

export function isToday(value: string) {
  return value === toDateKey(new Date());
}
