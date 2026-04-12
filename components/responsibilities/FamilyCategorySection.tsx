'use client';

import { FamilyCategoryActions } from '@/components/responsibilities/FamilyCategoryActions';
import { FamilyResponsibilityCardList } from '@/components/responsibilities/FamilyResponsibilityCardList';
import { resolveCategoryLabel } from '@/services/resultCalculator';
import type { FamilyResponsibilityCard } from '@/types/responsibility-cards';
import type { QuizCategory } from '@/types/quiz';

interface FamilyCategorySectionProps {
  categoryKey: QuizCategory;
  cards: FamilyResponsibilityCard[];
  onOpenCatalog: () => void;
  onCreateCard: () => void;
}

export function FamilyCategorySection({ categoryKey, cards, onOpenCatalog, onCreateCard }: FamilyCategorySectionProps) {
  return (
    <article className="card stack ownership-category-shell">
      <header className="ownership-group-header">
        <div className="ownership-group-heading">
          <h2 className="card-title" style={{ margin: 0 }}>{resolveCategoryLabel(categoryKey)}</h2>
          <p className="helper ownership-group-meta" style={{ margin: 0 }}>{cards.length} Karten</p>
        </div>
        <FamilyCategoryActions onOpenCatalog={onOpenCatalog} onCreateCard={onCreateCard} />
      </header>

      {cards.length === 0
        ? <p className="helper">In dieser Kategorie gibt es noch keine Familien-Karten.</p>
        : <FamilyResponsibilityCardList cards={cards} categoryKey={categoryKey} />}
    </article>
  );
}
