import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import { QUESTION_POOL_0_1 } from '@/data/question-pool-0-1';
import { db } from '@/lib/firebase';
import { firestoreCollections } from '@/types/domain';
import type { QuizQuestion } from '@/types/quiz';

interface FirestorePoolRecord {
  ageGroup: string;
  questions: QuizQuestion[];
}

export async function getQuestionPoolByAgeGroup(ageGroup: string): Promise<QuizQuestion[]> {
  try {
    const poolQuery = query(
      collection(db, firestoreCollections.questionPools),
      where('ageGroup', '==', ageGroup),
      limit(1),
    );
    const snapshot = await getDocs(poolQuery);
    if (!snapshot.empty) {
      const payload = snapshot.docs[0].data() as FirestorePoolRecord;
      if (Array.isArray(payload.questions) && payload.questions.length > 0) {
        return payload.questions;
      }
    }
  } catch {
    // Fallback to local seed for MVP.
  }

  if (ageGroup === '0-1') {
    return QUESTION_POOL_0_1;
  }

  return [];
}
