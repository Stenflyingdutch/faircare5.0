import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { quizCatalog as localCatalog, questionTemplates as localTemplates } from '@/data/questionTemplates';
import { db } from '@/lib/firebase';
import { ensureValidQuizCatalog } from '@/services/catalogValidation';
import { firestoreCollections } from '@/types/domain';
import type { DetailedReport, QuestionTemplate, QuizCatalog, TempQuizSession } from '@/types/quiz';

export async function fetchQuizCatalog(): Promise<QuizCatalog> {
  try {
    const snapshot = await getDocs(query(collection(db, firestoreCollections.questionPools), limit(1)));
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      if (data.catalog?.categories && data.catalog?.questions) {
        return ensureValidQuizCatalog(data.catalog, localCatalog);
      }
    }
  } catch {
    // fallback to local template seed
  }
  return localCatalog;
}

export async function fetchQuestionTemplates(): Promise<QuestionTemplate[]> {
  const catalog = await fetchQuizCatalog();
  return catalog.questions?.length ? catalog.questions : localTemplates;
}

export async function persistQuizCatalog(catalog: QuizCatalog) {
  await setDoc(doc(db, firestoreCollections.questionPools, 'default'), {
    catalog,
    templates: catalog.questions,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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
  const templates = await fetchQuestionTemplates();
  const lookup = new Map(templates.map((q) => [q.id, q]));
  const questionSetSnapshot = session.questionIds.map((id) => lookup.get(id)).filter(Boolean);

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
    questionSetSnapshot,
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
