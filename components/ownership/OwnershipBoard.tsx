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

export function OwnershipBoard({ familyId, currentUserId, cards, mode, ownerOptions }: OwnershipBoardProps) {
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryForCreate, setActiveCategoryForCreate] = useState<QuizCategory | null>(null);

  const visibleCards = useMemo(() => {
    if (mode === 'home') {
      return cards.filter((card) => card.ownerUserId === currentUserId);
    }
    return cards;
  }, [cards, currentUserId, mode]);

  const grouped = useMemo(() => {
    const map = new Map<QuizCategory, OwnershipCardDocument[]>();
    visibleCards.forEach((card) => {
      const list = map.get(card.categoryKey) ?? [];
      list.push(card);
      map.set(card.categoryKey, list);
    });

    for (const [category, list] of map.entries()) {
      map.set(category, [...list].sort((a, b) => focusOrder.indexOf(a.focusLevel) - focusOrder.indexOf(b.focusLevel) || a.sortOrder - b.sortOrder));
    }

    return [...map.entries()].sort((a, b) => categoryLabelMap[a[0]].localeCompare(categoryLabelMap[b[0]]));
  }, [visibleCards]);

  function beginEdit(card: OwnershipCardDocument) {
    setEditingCardId(card.id);
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
          ownerUserId: draft.ownerUserId,
          focusLevel: draft.focusLevel,
          sortOrder: card.sortOrder,
        },
      });
      setEditingCardId(null);
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
      setEditingCardId(null);
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
              <div key={card.id} className="report-block stack">
                {editingCardId === card.id && draft ? (
                  <>
                    <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                    <textarea className="input" rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                    <select className="input" value={draft.ownerUserId} onChange={(e) => setDraft({ ...draft, ownerUserId: e.target.value })}>
                      {ownerOptions.map((option) => (
                        <option key={option.userId} value={option.userId}>{option.label}</option>
                      ))}
                    </select>
                    <select className="input" value={draft.focusLevel} onChange={(e) => setDraft({ ...draft, focusLevel: e.target.value as OwnershipFocusLevel })}>
                      {focusOrder.map((level) => <option key={level} value={level}>{focusLevelLabel[level]}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="button primary" disabled={saving} onClick={() => saveEdit(card)}>Speichern</button>
                      {mode === 'dashboard' && <button type="button" className="button" disabled={saving} onClick={() => deleteCard(card.id)}>Löschen</button>}
                      <button type="button" className="button" onClick={() => { setEditingCardId(null); setDraft(null); }}>Abbrechen</button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong>{card.title}</strong>
                    {card.note ? <p className="helper" style={{ margin: 0 }}>{card.note}</p> : null}
                    <p className="helper" style={{ margin: 0 }}>Fokus: {focusLevelLabel[card.focusLevel]}</p>
                    <p className="helper" style={{ margin: 0 }}>
                      Owner: {ownerOptions.find((option) => option.userId === card.ownerUserId)?.label ?? (card.ownerUserId === currentUserId ? 'Du' : 'Partner')}
                    </p>
                    <button type="button" className="button" onClick={() => beginEdit(card)}>Bearbeiten</button>
                  </>
                )}
              </div>
            ))}
            {!categoryCards.length && <p className="helper">Noch keine Karten in dieser Kategorie.</p>}
          </div>
        </article>
      ))}

      {!grouped.length && <p className="helper">Noch keine Ownership-Karten verfügbar.</p>}
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
