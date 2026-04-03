import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QUESTION_POOL_0_1, type OwnershipQuestion } from './questionPool';

const isValidQuestion = (q: Partial<OwnershipQuestion>): q is OwnershipQuestion =>
  typeof q.id === 'string' && typeof q.text === 'string' && typeof q.category === 'string' && q.ageGroup === '0_1';

export const loadQuestionPool = async (): Promise<OwnershipQuestion[]> => {
  try {
    const snap = await getDoc(doc(db, 'questionPools', 'ownership_0_1_v1'));
    if (snap.exists()) {
      const data = snap.data() as { questions?: Partial<OwnershipQuestion>[] };
      const normalized = (data.questions || []).filter(isValidQuestion);

      const requiredIds = new Set(QUESTION_POOL_0_1.map((q) => q.id));
      const hasCatalogCoverage = normalized.filter((q) => requiredIds.has(q.id)).length >= 15;

      if (hasCatalogCoverage) {
        return QUESTION_POOL_0_1.map((base) => normalized.find((q) => q.id === base.id) || base);
      }
    }
  } catch {
    // fallback for MVP
  }
  return QUESTION_POOL_0_1;
};
