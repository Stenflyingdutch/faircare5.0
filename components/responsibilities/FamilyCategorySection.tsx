'use client';

import { ResponsibilityHeaderActions } from '@/components/responsibilities/ResponsibilityHeaderActions';
import { FamilyResponsibilityCardList } from '@/components/responsibilities/FamilyResponsibilityCardList';
import { resolveCategoryLabel } from '@/services/resultCalculator';
import type { FamilyResponsibilityCard } from '@/types/responsibility-cards';

interface FamilyCategorySectionProps {
  categoryKey: string;
  cards: FamilyResponsibilityCard[];
  onOpenCatalog: () => void;
  onCreateCard: () => void;
}

export function FamilyCategorySection({ categoryKey, cards, onOpenCatalog, onCreateCard }: FamilyCategorySectionProps) {
  const assignedCount = cards.filter((card) => Boolean(card.assigneeUserId)).length;

  return (
    <article className="card stack ownership-category-shell">
      <div className="ownership-group-header">
        <div className="ownership-group-heading">
          <h3 className="card-title" style={{ margin: 0 }}>{resolveCategoryLabel(categoryKey)}</h3>
          <span className="helper ownership-group-meta">{assignedCount} zugeordnet von {cards.length}</span>
        </div>
        <ResponsibilityHeaderActions onOpenCatalog={onOpenCatalog} onCreateCard={onCreateCard} />
      </div>

      {cards.length > 0 ? (
        <FamilyResponsibilityCardList cards={cards} categoryKey={categoryKey} />
      ) : (
        <div className="report-block stack-sm" style={{ marginTop: 4 }}>
          <p className="helper" style={{ margin: 0 }}>Für diese Kategorie gibt es noch keine Familien-Karten.</p>
          <ResponsibilityHeaderActions onOpenCatalog={onOpenCatalog} onCreateCard={onCreateCard} />
        </div>
      )}
    </article>
  );
}
