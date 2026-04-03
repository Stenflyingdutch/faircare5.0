import type { TempQuizSession } from '@/types/quiz';

const STORAGE_KEY = 'faircare_quiz_temp_session_v3';

export function createTempSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function loadSessionFromStorage() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TempQuizSession;
  } catch {
    return null;
  }
}

export function saveSessionToStorage(session: TempQuizSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSessionFromStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
