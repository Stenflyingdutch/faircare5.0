import { doc, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { firestoreCollections } from '@/types/domain';
import type { OwnershipAnswer, StressCategory, TempQuizSession } from '@/types/quiz';

const STORAGE_KEY = 'carefair_temp_quiz_session_v2';

export function createTempSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadLocalSession(): TempQuizSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as TempQuizSession;
  } catch {
    return null;
  }
}

export function saveLocalSession(session: TempQuizSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearLocalSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function persistSession(session: TempQuizSession) {
  await setDoc(doc(db, firestoreCollections.quizSessions, session.tempSessionId), session, { merge: true });
}

export async function persistAnswers(tempSessionId: string, answers: Partial<Record<string, OwnershipAnswer>>) {
  await setDoc(
    doc(db, firestoreCollections.quizAnswers, tempSessionId),
    {
      tempSessionId,
      answers,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function persistResult(tempSessionId: string, data: { stressCategories: StressCategory[]; summary: unknown }) {
  await setDoc(
    doc(db, firestoreCollections.results, tempSessionId),
    {
      tempSessionId,
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
