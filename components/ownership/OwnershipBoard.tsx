'use client';

import { useMemo, useState } from 'react';

import { categoryLabelMap } from '@/services/resultCalculator';
import { softDeleteOwnershipCard, upsertOwnershipCard } from '@/services/ownership.service';
import type { OwnershipCardDocument, OwnershipFocusLevel } from '@/types/ownership';
import type { QuizCategory } from '@/types/quiz';

interface OwnershipBoardProps {
  familyId: string;
  currentUserId: string;
  cards: OwnershipCardDocument[];
  mode: 'dashboard' | 'home';
  ownerOptions: Array<{ userId: string; label: string }>;
  categoryKeys?: QuizCategory[];
}

const focusLevelLabel: Record<OwnershipFocusLevel, string> = {
  now: 'Jetzt angehen',
  soon: 'Bald einplanen',
  later: 'Im Blick behalten',
};

const focusOrder: OwnershipFocusLevel[] = ['now', 'soon', 'later'];

interface DraftState {
  title: string;
  note: string;
  ownerUserId: string;
  focusLevel: OwnershipFocusLevel;
}

export function OwnershipBoard({ familyId, currentUserId, cards, mode, ownerOptions, categoryKeys = [] }: OwnershipBoardProps) {
  const [openedCardId, setOpenedCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryForCreate, setActiveCategoryForCreate] = useState<QuizCategory | null>(null);

  const openedCard = useMemo(() => cards.find((item) => item.id === openedCardId) ?? null, [cards, openedCardId]);

  const visibleCards = useMemo(() => {
    if (mode === 'home') {
      return cards.filter((card) => card.ownerUserId === currentUserId);
    }
    return cards;
  }, [cards, currentUserId, mode]);

  const grouped = useMemo(() => {
    const map = new Map<QuizCategory, OwnershipCardDocument[]>();
    if (mode === 'dashboard') {
      categoryKeys.forEach((categoryKey) => map.set(categoryKey, []));
    }
    visibleCards.forEach((card) => {
      const list = map.get(card.categoryKey) ?? [];
      list.push(card);
      map.set(card.categoryKey, list);
    });

    for (const [category, list] of map.entries()) {
      map.set(category, [...list].sort((a, b) => focusOrder.indexOf(a.focusLevel) - focusOrder.indexOf(b.focusLevel) || a.sortOrder - b.sortOrder));
    }

    return [...map.entries()].sort((a, b) => categoryLabelMap[a[0]].localeCompare(categoryLabelMap[b[0]]));
  }, [visibleCards, mode, categoryKeys]);

  function beginEdit(card: OwnershipCardDocument) {
    setOpenedCardId(card.id);
    setDraft({
      title: card.title,
      note: card.note,
      ownerUserId: card.ownerUserId,
      focusLevel: card.focusLevel,
    });
    setError(null);
  }

  async function saveEdit(card: OwnershipCardDocument) {
    if (!draft) return;
    setSaving(true);
    setError(null);

    try {
      await upsertOwnershipCard({
        familyId,
        cardId: card.id,
        actorUserId: currentUserId,
        payload: {
          categoryKey: card.categoryKey,
          title: draft.title.trim() || card.title,
          note: draft.note.trim(),
          ownerUserId: mode === 'home' ? card.ownerUserId : draft.ownerUserId,
          focusLevel: draft.focusLevel,
          sortOrder: card.sortOrder,
        },
      });
      setOpenedCardId(null);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  async function createCard(categoryKey: QuizCategory) {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await upsertOwnershipCard({
        familyId,
        actorUserId: currentUserId,
        payload: {
          categoryKey,
          title: draft.title.trim() || 'Verantwortungsbereich planen und umsetzen',
          note: draft.note.trim(),
          ownerUserId: draft.ownerUserId,
          focusLevel: draft.focusLevel,
          sortOrder: Date.now(),
        },
      });
      setActiveCategoryForCreate(null);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Karte konnte nicht erstellt werden.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCard(cardId: string) {
    setSaving(true);
    setError(null);
    try {
      await softDeleteOwnershipCard(familyId, cardId, currentUserId);
      setOpenedCardId(null);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Karte konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      {grouped.map(([category, categoryCards]) => (
        <article key={category} className="card stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h3 className="card-title" style={{ margin: 0 }}>{categoryLabelMap[category]}</h3>
            {mode === 'dashboard' && (
              <button
                type="button"
                className="button"
                onClick={() => {
                  setActiveCategoryForCreate(category);
                  setDraft({ title: '', note: '', ownerUserId: ownerOptions[0]?.userId ?? currentUserId, focusLevel: 'soon' });
                }}
              >
                Neue Karte
              </button>
            )}
          </div>

          {activeCategoryForCreate === category && draft && mode === 'dashboard' && (
            <div className="report-block stack">
              <p className="helper" style={{ margin: 0 }}>Neue lokale Karte in dieser Kategorie.</p>
              <input className="input" value={draft.title} placeholder="Titel" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <textarea className="input" rows={3} value={draft.note} placeholder="Notiz" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              <select className="input" value={draft.ownerUserId} onChange={(e) => setDraft({ ...draft, ownerUserId: e.target.value })}>
                {ownerOptions.map((option) => (
                  <option key={option.userId} value={option.userId}>{option.label}</option>
                ))}
              </select>
              <select className="input" value={draft.focusLevel} onChange={(e) => setDraft({ ...draft, focusLevel: e.target.value as OwnershipFocusLevel })}>
                {focusOrder.map((level) => <option key={level} value={level}>{focusLevelLabel[level]}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="button primary" disabled={saving} onClick={() => createCard(category)}>Erstellen</button>
                <button type="button" className="button" onClick={() => { setActiveCategoryForCreate(null); setDraft(null); }}>Abbrechen</button>
              </div>
            </div>
          )}

          <div className="stack">
            {categoryCards.map((card) => (
              <button
                key={card.id}
                type="button"
                className="report-block stack"
                style={{ textAlign: 'left', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                onClick={() => beginEdit(card)}
              >
                <strong>{card.title}</strong>
                {card.note ? <p className="helper" style={{ margin: 0 }}>{card.note}</p> : null}
                <p className="helper" style={{ margin: 0 }}>Fokus: {focusLevelLabel[card.focusLevel]}</p>
                <p className="helper" style={{ margin: 0 }}>
                  Owner: {ownerOptions.find((option) => option.userId === card.ownerUserId)?.label ?? (card.ownerUserId === currentUserId ? 'Du' : 'Partner')}
                </p>
              </button>
            ))}
            {!categoryCards.length && <p className="helper">Noch keine Karten in dieser Kategorie.</p>}
          </div>
        </article>
      ))}

      {!grouped.length && (
        <p className="helper">
          {mode === 'home'
            ? 'Es sind aktuell keine Karten dir zugeordnet.'
            : 'Noch keine Ownership-Kategorien aktiviert.'}
        </p>
      )}
      {error && <p className="inline-error">{error}</p>}

      {openedCard && draft && (
        <div className="card stack" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 30, maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
          <h3 className="card-title" style={{ margin: 0 }}>{categoryLabelMap[openedCard.categoryKey]}</h3>
          <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="input" rows={4} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          {mode === 'dashboard' ? (
            <select className="input" value={draft.ownerUserId} onChange={(e) => setDraft({ ...draft, ownerUserId: e.target.value })}>
              {ownerOptions.map((option) => (
                <option key={option.userId} value={option.userId}>{option.label}</option>
              ))}
            </select>
          ) : (
            <p className="helper" style={{ margin: 0 }}>Owner bleibt im Home-Bereich unverändert.</p>
          )}
          <select className="input" value={draft.focusLevel} onChange={(e) => setDraft({ ...draft, focusLevel: e.target.value as OwnershipFocusLevel })}>
            {focusOrder.map((level) => <option key={level} value={level}>{focusLevelLabel[level]}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="button primary" disabled={saving} onClick={() => saveEdit(openedCard)}>Speichern</button>
            {mode === 'dashboard' && <button type="button" className="button" disabled={saving} onClick={() => deleteCard(openedCard.id)}>Löschen</button>}
            <button type="button" className="button" onClick={() => { setOpenedCardId(null); setDraft(null); }}>Schließen</button>
          </div>
        </div>
      )}
    </div>
  );
}
