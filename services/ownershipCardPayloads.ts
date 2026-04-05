import type { OwnershipCardDocument, OwnershipFocusLevel } from '@/types/ownership';
import type { QuizCategory } from '@/types/quiz';

export type OwnershipCardPatch = Partial<Pick<OwnershipCardDocument, 'categoryKey' | 'title' | 'note' | 'ownerUserId' | 'focusLevel' | 'sortOrder' | 'isActive'>>;

export function buildOwnershipMetaPatch(input: { title: string; note: string }): OwnershipCardPatch {
  return {
    title: input.title,
    note: input.note,
  };
}

export function buildOwnershipOwnerPatch(ownerUserId: string | null): OwnershipCardPatch {
  return { ownerUserId };
}

export function buildOwnershipFocusPatch(focusLevel: OwnershipFocusLevel | null): OwnershipCardPatch {
  return { focusLevel };
}

export function buildOwnershipActivationPatch(isActive: boolean): OwnershipCardPatch {
  return { isActive };
}

export function buildOwnershipCreatePayload(input: {
  categoryKey: QuizCategory;
  title: string;
  note: string;
  sortOrder: number;
}): Required<Pick<OwnershipCardDocument, 'categoryKey' | 'title' | 'note' | 'sortOrder' | 'isActive'>> & Pick<OwnershipCardDocument, 'ownerUserId' | 'focusLevel'> {
  return {
    categoryKey: input.categoryKey,
    title: input.title,
    note: input.note,
    ownerUserId: null,
    focusLevel: null,
    isActive: false,
    sortOrder: input.sortOrder,
  };
}
