'use client';

import type { FamilyResponsibilityCard } from '@/types/responsibility-cards';

interface FamilyResponsibilityCardProps {
  card: FamilyResponsibilityCard;
}

function focusLabel(value: FamilyResponsibilityCard['focusState']) {
  if (value === 'now') return 'Jetzt angehen';
  if (value === 'soon') return 'Bald einplanen';
  if (value === 'later') return 'Im Blick behalten';
  return 'Kein Fokus';
}

function statusLabel(value: FamilyResponsibilityCard['status']) {
  return value === 'done' ? 'Erledigt' : 'Offen';
}

export function FamilyResponsibilityCardItem({ card }: FamilyResponsibilityCardProps) {
  return (
    <article className="ownership-card stack" style={{ ['--ownership-accent' as string]: card.status === 'done' ? '#2f6f6d' : '#7c5cfa' }}>
      <div className="ownership-card-topline">
        <span className="ownership-card-kicker">Verantwortungsbereich</span>
        <div className="ownership-card-topline-actions">
          <span className="ownership-card-focus">{statusLabel(card.status)}</span>
        </div>
      </div>
      <strong className="ownership-card-title">{card.title}</strong>
      {card.description ? <p className="helper ownership-card-note" style={{ margin: 0 }}>{card.description}</p> : null}
      <p className="helper" style={{ margin: 0 }}>Fokus: {focusLabel(card.focusState)}</p>
    </article>
  );
}
