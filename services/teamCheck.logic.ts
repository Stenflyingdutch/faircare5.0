import type { TeamCheckFrequency } from '@/types/team-check';

const DEFAULT_REMINDER_HOUR = '09:00';

export function toScheduledKey(isoDate: string) {
  return isoDate.slice(0, 10);
}

function parseHourAndMinute(time?: string | null, fallback = DEFAULT_REMINDER_HOUR) {
  const normalized = (time?.trim() || fallback);
  const [hourPart, minutePart] = normalized.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return { hour: 9, minute: 0 };
  return { hour: Math.min(23, Math.max(0, hour)), minute: Math.min(59, Math.max(0, minute)) };
}

function alignWithTime(base: Date, time?: string | null, fallback?: string) {
  const { hour, minute } = parseHourAndMinute(time, fallback);
  const copy = new Date(base);
  copy.setHours(hour, minute, 0, 0);
  return copy;
}

function resolveFixedWeekdayAnchor(weekday: number, time?: string | null) {
  const anchor = alignWithTime(new Date(1970, 0, 1), time);
  const offset = (weekday - anchor.getDay() + 7) % 7;
  anchor.setDate(anchor.getDate() + offset);
  return anchor;
}

function computeNextIntervalDate(params: {
  now: Date;
  dayOfWeek: number;
  intervalDays: number;
  time?: string | null;
}) {
  const anchor = resolveFixedWeekdayAnchor(params.dayOfWeek, params.time);
  const candidate = new Date(anchor);

  while (candidate.getTime() < params.now.getTime()) {
    candidate.setDate(candidate.getDate() + params.intervalDays);
  }

  return candidate;
}

function firstWeekdayOfMonth(year: number, monthIndex: number, weekday: number, time?: string | null) {
  const firstDay = new Date(year, monthIndex, 1);
  const offset = (weekday - firstDay.getDay() + 7) % 7;
  firstDay.setDate(firstDay.getDate() + offset);
  return alignWithTime(firstDay, time);
}

export function computeNextTeamCheckAt(params: {
  from?: Date;
  frequency: TeamCheckFrequency;
  dayOfWeek: number;
  time?: string | null;
}) {
  const now = params.from ?? new Date();
  if (params.frequency === 'weekly') {
    return computeNextIntervalDate({ now, dayOfWeek: params.dayOfWeek, intervalDays: 7, time: params.time });
  }
  if (params.frequency === 'biweekly') {
    return computeNextIntervalDate({ now, dayOfWeek: params.dayOfWeek, intervalDays: 14, time: params.time });
  }

  const thisMonth = firstWeekdayOfMonth(now.getFullYear(), now.getMonth(), params.dayOfWeek, params.time);
  if (thisMonth.getTime() >= now.getTime()) return thisMonth;
  return firstWeekdayOfMonth(now.getFullYear(), now.getMonth() + 1, params.dayOfWeek, params.time);
}

export function computeReminderAt(nextCheckInAtIso: string, time?: string | null) {
  const checkInDate = new Date(nextCheckInAtIso);
  const reminder = new Date(checkInDate);
  reminder.setDate(reminder.getDate() - 1);
  return alignWithTime(reminder, time, DEFAULT_REMINDER_HOUR).toISOString();
}

export function isTeamCheckBadgeVisible(params: {
  nextCheckInAt?: string | null;
  reminderActiveAt?: string | null;
  now?: Date;
}) {
  if (!params.nextCheckInAt || !params.reminderActiveAt) return false;
  const now = params.now ?? new Date();
  const reminderAt = new Date(params.reminderActiveAt);
  const nextAt = new Date(params.nextCheckInAt);
  return now.getTime() >= reminderAt.getTime() && now.getTime() <= nextAt.getTime();
}

export function formatTeamCheckDate(value?: string | null, withTime = false) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(parsed);
}
