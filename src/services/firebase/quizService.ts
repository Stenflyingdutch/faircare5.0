import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseApp';
import type { QuizAnswer, QuizSession } from '@/types/quiz';

export const createQuizSession = async (session: QuizSession) => addDoc(collection(db, 'quizSessions'), session);
export const saveQuizAnswer = async (answer: QuizAnswer) => addDoc(collection(db, 'quizAnswers'), answer);

export const getAnswersForSessionAndUser = async (sessionId: string, userId: string) => {
  const q = query(collection(db, 'quizAnswers'), where('sessionId', '==', sessionId), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as QuizAnswer);
};
