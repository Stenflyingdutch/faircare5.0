import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OwnershipOption } from './questionPool';

export interface TempSessionData {
  tempSessionId: string;
  childCount: '1' | '2' | '3_plus';
  youngestAgeGroup: '0_1' | '1_3' | '3_6' | '6_12' | '12_18';
  childcareTags: string[];
  splitClarity: 'eher_klar' | 'teils_klar' | 'oft_unklar';
  questionIds: string[];
  answers: Record<string, OwnershipOption>;
  stressCategories: string[];
  sourcePlatform: 'web';
  createdAt: string;
  completedAt?: string;
}

const KEY = 'public_test_temp_session_v2';

export const createTempSessionId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const saveLocalSession = (session: TempSessionData) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
};

export const loadLocalSession = (): TempSessionData | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TempSessionData;
  } catch {
    return null;
  }
};

export const clearLocalSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
};

export const persistSessionToFirestore = async (session: TempSessionData) => {
  await setDoc(doc(db, 'quizSessions', session.tempSessionId), {
    sessionId: session.tempSessionId,
    householdId: null,
    status: session.completedAt ? 'completed' : 'active',
    sourcePlatform: 'web',
    childCount: session.childCount,
    youngestAgeGroup: session.youngestAgeGroup,
    childcareTags: session.childcareTags,
    splitClarity: session.splitClarity,
    questionIds: session.questionIds,
    stressCategories: session.stressCategories,
    createdAt: session.createdAt,
    completedAt: session.completedAt || null,
  }, { merge: true });

  await Promise.all(
    Object.entries(session.answers).map(([questionId, value]) =>
      addDoc(collection(db, 'quizAnswers'), {
        sessionId: session.tempSessionId,
        userId: null,
        questionId,
        categoryId: null,
        answerValue: value,
        scoreValue: null,
        createdAt: new Date().toISOString(),
      }),
    ),
  );
};

export const persistResultPreview = async (sessionId: string, result: Record<string, unknown>) => {
  await addDoc(collection(db, 'results'), {
    sessionId,
    userId: null,
    mode: 'public_preview',
    ...result,
    createdAt: new Date().toISOString(),
  });
};
