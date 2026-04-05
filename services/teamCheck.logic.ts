import type { TeamCheckFrequency } from '@/types/team-check';

const DEFAULT_REMINDER_HOUR = '09:00';

export function toScheduledKey(isoDate: string) {
  return isoDate.slice(0, 10);
}

function parseHourAndMinute(time?: string | null) {
  const normalized = (time?.trim() || DEFAULT_REMINDER_HOUR);
  const [hourPart, minutePart] = normalized.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return { hour: 9, minute: 0 };
  return { hour: Math.min(23, Math.max(0, hour)), minute: Math.min(59, Math.max(0, minute)) };
}

function alignWithTime(base: Date, time?: string | null) {
  const { hour, minute } = parseHourAndMinute(time);
  const copy = new Date(base);
  copy.setHours(hour, minute, 0, 0);
  return copy;
}

function startOfNextDay(now: Date) {
  const copy = new Date(now);
  copy.setDate(copy.getDate() + 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function computeWeeklyLikeNextDate(params: { now: Date; dayOfWeek: number; intervalDays: number; time?: string | null }) {
  const candidate = startOfNextDay(params.now);
  const offset = (params.dayOfWeek - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + offset);
  const withTime = alignWithTime(candidate, params.time);
  if (params.intervalDays === 7) return withTime;

  const diffDays = Math.floor((withTime.getTime() - params.now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= params.intervalDays) {
    return withTime;
  }
  const fallback = new Date(withTime);
  fallback.setDate(fallback.getDate() + params.intervalDays);
  return fallback;
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
    return computeWeeklyLikeNextDate({ now, dayOfWeek: params.dayOfWeek, intervalDays: 7, time: params.time });
  }
  if (params.frequency === 'biweekly') {
    return computeWeeklyLikeNextDate({ now, dayOfWeek: params.dayOfWeek, intervalDays: 14, time: params.time });
  }

  const thisMonth = firstWeekdayOfMonth(now.getFullYear(), now.getMonth(), params.dayOfWeek, params.time);
  if (thisMonth.getTime() > now.getTime()) return thisMonth;
  return firstWeekdayOfMonth(now.getFullYear(), now.getMonth() + 1, params.dayOfWeek, params.time);
}

export function computeReminderAt(nextCheckInAtIso: string, time?: string | null) {
  const checkInDate = new Date(nextCheckInAtIso);
  const reminder = new Date(checkInDate);
  reminder.setDate(reminder.getDate() - 2);
  return alignWithTime(reminder, time).toISOString();
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
