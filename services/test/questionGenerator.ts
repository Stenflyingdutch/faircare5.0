import { QUESTION_POOL_0_1, type OwnershipQuestion } from './questionPool';

export interface TestFilterInput {
  childCount: '1' | '2' | '3_plus';
  youngestAgeGroup: '0_1' | '1_3' | '3_6' | '6_12' | '12_18';
  childcareTags: string[];
  splitClarity: 'eher_klar' | 'teils_klar' | 'oft_unklar';
}

export const generateQuestions = (filters: TestFilterInput, targetCount = 15): OwnershipQuestion[] => {
  const filtered = QUESTION_POOL_0_1.filter((q) => {
    if (q.requiresChildcareTag === 'grosseltern_familie' && !filters.childcareTags.includes('grosseltern_familie')) return false;
    if (q.requiresChildcareTag === 'babysitter_nanny' && !filters.childcareTags.includes('babysitter_nanny')) return false;
    return true;
  });

  const core = filtered.filter((q) => q.core);
  const nonCore = filtered.filter((q) => !q.core);

  const selected: OwnershipQuestion[] = [...core];

  for (const question of nonCore) {
    if (selected.length >= targetCount) break;
    if (!selected.some((s) => s.id === question.id)) selected.push(question);
  }

  return selected.slice(0, targetCount);
};
