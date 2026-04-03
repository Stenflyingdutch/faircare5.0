import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { questionTemplates as localTemplates } from '@/data/questionTemplates';
import { db } from '@/lib/firebase';
import { firestoreCollections } from '@/types/domain';
import type { DetailedReport, QuestionTemplate, TempQuizSession } from '@/types/quiz';

export async function fetchQuestionTemplates(): Promise<QuestionTemplate[]> {
  try {
    const snapshot = await getDocs(query(collection(db, firestoreCollections.questionPools), limit(1)));
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      if (Array.isArray(data.templates)) {
        return data.templates as QuestionTemplate[];
      }
    }
  } catch {
    // fallback to local template seed
  }
  return localTemplates;
}

export async function persistQuizSession(session: TempQuizSession) {
  await setDoc(doc(db, firestoreCollections.quizSessions, session.tempSessionId), {
    ...session,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function persistQuizAnswers(session: TempQuizSession) {
  await setDoc(doc(db, firestoreCollections.quizAnswers, session.tempSessionId), {
    tempSessionId: session.tempSessionId,
    answers: session.answers,
    questionIds: session.questionIds,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function persistQuizResult(session: TempQuizSession, report: DetailedReport, isAnonymous: boolean) {
  await setDoc(doc(db, firestoreCollections.results, session.tempSessionId), {
    tempSessionId: session.tempSessionId,
    userId: session.userId ?? null,
    isAnonymous,
    stressCategories: session.stressCategories,
    summary: report.summary,
    detailedReport: report,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function persistUserResult(userId: string, session: TempQuizSession, report: DetailedReport) {
  await setDoc(doc(db, firestoreCollections.userResults, userId), {
    userId,
    tempSessionId: session.tempSessionId,
    filter: {
      childCount: session.childCount,
      youngestAgeGroup: session.youngestAgeGroup,
      childcareTags: session.childcareTags,
      splitClarity: session.splitClarity,
    },
    questionIds: session.questionIds,
    answers: session.answers,
    stressCategories: session.stressCategories,
    summary: report.summary,
    detailedReport: report,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function fetchUserResult(userId: string) {
  const snapshot = await getDocs(query(collection(db, firestoreCollections.userResults), where('userId', '==', userId), limit(1)));
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}
