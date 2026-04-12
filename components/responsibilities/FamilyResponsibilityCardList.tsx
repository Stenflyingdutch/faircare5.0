'use client';

import { resolveCategoryLabel } from '@/services/resultCalculator';
import type { FamilyResponsibilityCard } from '@/types/responsibility-cards';

interface FamilyResponsibilityCardListProps {
  cards: FamilyResponsibilityCard[];
  categoryKey: string;
}

function resolveStatusLabel(card: FamilyResponsibilityCard) {
  if (card.assigneeUserId) return 'Zugeordnet';
  if (card.status === 'done') return 'Erledigt';
  return 'Noch offen';
}

function resolveStatusStyle(card: FamilyResponsibilityCard) {
  if (card.assigneeUserId) {
    return {
      background: 'linear-gradient(135deg, #2f6f6d 0%, #4f9995 100%)',
      color: '#ffffff',
      borderColor: 'rgba(47, 111, 109, 0.95)',
    };
  }

  if (card.status === 'done') {
    return {
      background: 'linear-gradient(135deg, #7c5cfa 0%, #9a85ff 100%)',
      color: '#ffffff',
      borderColor: 'rgba(124, 92, 250, 0.95)',
    };
  }

  return {
    background: 'linear-gradient(135deg, #f1efe9 0%, #e6e0d6 100%)',
    color: '#4f5a66',
    borderColor: 'rgba(206, 198, 185, 0.95)',
  };
}

export function FamilyResponsibilityCardList({ cards, categoryKey }: FamilyResponsibilityCardListProps) {
  return (
    <div className="stack">
      {cards.map((card) => {
        const statusStyle = resolveStatusStyle(card);
        return (
          <article
            key={card.id}
            className="ownership-card stack"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(243,239,232,0.98) 100%)',
              ['--ownership-accent' as string]: card.assigneeUserId ? '#2f6f6d' : '#d6cbff',
            }}
          >
            <div className="ownership-card-topline">
              <span className="ownership-card-kicker">{resolveCategoryLabel(categoryKey)}</span>
              {card.focusState ? <span className="ownership-card-focus">{card.focusState === 'now' ? 'Jetzt angehen' : card.focusState === 'soon' ? 'Bald einplanen' : 'Im Blick behalten'}</span> : null}
            </div>
            <strong className="ownership-card-title">{card.title}</strong>
            {card.description ? <p className="helper ownership-card-note" style={{ margin: 0 }}>{card.description}</p> : null}
            <button
              type="button"
              className="ownership-owner-button"
              style={statusStyle}
              disabled
              aria-label={`Status ${resolveStatusLabel(card)}`}
              title="Status wird in den Kartendetails verwaltet"
            >
              {resolveStatusLabel(card)}
            </button>
          </article>
        );
      })}
    </div>
  );
}
