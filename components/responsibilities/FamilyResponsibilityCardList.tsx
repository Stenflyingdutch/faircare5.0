'use client';

import { FamilyResponsibilityCardItem } from '@/components/responsibilities/FamilyResponsibilityCard';
import type { FamilyResponsibilityCard } from '@/types/responsibility-cards';

interface FamilyResponsibilityCardListProps {
  cards: FamilyResponsibilityCard[];
}

export function FamilyResponsibilityCardList({ cards }: FamilyResponsibilityCardListProps) {
  return (
    <div className="stack">
      {cards.map((card) => (
        <FamilyResponsibilityCardItem key={card.id} card={card} />
      ))}
    </div>
  );
}
