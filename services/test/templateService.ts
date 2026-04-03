import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QUESTION_POOL_0_1, type OwnershipQuestion } from './questionPool';

export const loadQuestionPool = async (): Promise<OwnershipQuestion[]> => {
  try {
    const snap = await getDoc(doc(db, 'questionPools', 'ownership_0_1_v1'));
    if (snap.exists()) {
      const data = snap.data() as { questions?: OwnershipQuestion[] };
      if (data.questions?.length) return data.questions;
    }
  } catch {
    // fallback for MVP
  }
  return QUESTION_POOL_0_1;
};
