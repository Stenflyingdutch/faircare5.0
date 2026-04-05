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

const focusOrder: Array<OwnershipFocusLevel | null> = ['now', 'soon', 'later', null];

interface DraftState {
  title: string;
  note: string;
  ownerUserId: string | null;
  focusLevel: OwnershipFocusLevel | null;
}

function resolveFocusSort(value?: OwnershipFocusLevel | null) {
  if (!value) return 3;
  return focusOrder.indexOf(value);
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
      map.set(category, [...list].sort((a, b) => resolveFocusSort(a.focusLevel) - resolveFocusSort(b.focusLevel) || a.sortOrder - b.sortOrder));
    }

    return [...map.entries()].sort((a, b) => categoryLabelMap[a[0]].localeCompare(categoryLabelMap[b[0]]));
  }, [visibleCards, mode, categoryKeys]);

  function beginEdit(card: OwnershipCardDocument) {
    setOpenedCardId(card.id);
    setDraft({
      title: card.title,
      note: card.note,
      ownerUserId: card.ownerUserId ?? null,
      focusLevel: card.focusLevel ?? null,
    });
    setError(null);
  }

  async function persistCard(card: OwnershipCardDocument, next: DraftState) {
    await upsertOwnershipCard({
      familyId,
      cardId: card.id,
      actorUserId: currentUserId,
      payload: {
        categoryKey: card.categoryKey,
        title: next.title.trim() || card.title,
        note: next.note.trim(),
        ownerUserId: mode === 'home' ? card.ownerUserId ?? null : next.ownerUserId,
        focusLevel: mode === 'dashboard' ? card.focusLevel ?? null : next.focusLevel,
        sortOrder: card.sortOrder,
      },
    });
  }

  async function saveEdit(card: OwnershipCardDocument) {
    if (!draft) return;
    setSaving(true);
    setError(null);

    try {
      await persistCard(card, draft);
      setOpenedCardId(null);
      setDraft(null);
    } catch {
      setError('Die Karte konnte gerade nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  async function setFocus(card: OwnershipCardDocument, level: OwnershipFocusLevel) {
    const nextLevel = card.focusLevel === level ? null : level;
    const nextDraft: DraftState = {
      title: card.title,
      note: card.note,
      ownerUserId: card.ownerUserId ?? null,
      focusLevel: nextLevel,
    };

    setSaving(true);
    setError(null);
    try {
      await persistCard(card, nextDraft);
    } catch {
      setError('Der Fokus konnte gerade nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  async function cycleOwner(card: OwnershipCardDocument) {
    const otherOwner = ownerOptions.find((option) => option.userId !== currentUserId)?.userId ?? null;
    const cycle: Array<string | null> = [null, currentUserId, otherOwner].filter((value, index, list) => list.indexOf(value) === index);
    const currentIndex = cycle.indexOf(card.ownerUserId ?? null);
    const nextOwner = cycle[(currentIndex + 1) % cycle.length] ?? null;

    setSaving(true);
    setError(null);
    try {
      await upsertOwnershipCard({
        familyId,
        cardId: card.id,
        actorUserId: currentUserId,
        payload: {
          categoryKey: card.categoryKey,
          title: card.title,
          note: card.note,
          ownerUserId: nextOwner,
          focusLevel: card.focusLevel ?? null,
          sortOrder: card.sortOrder,
        },
      });
    } catch {
      setError('Die Zuordnung konnte gerade nicht gespeichert werden. Bitte versuche es erneut.');
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
          ownerUserId: null,
          focusLevel: null,
          sortOrder: Date.now(),
        },
      });
      setActiveCategoryForCreate(null);
      setDraft(null);
    } catch {
      setError('Die Karte konnte gerade nicht erstellt werden. Bitte versuche es erneut.');
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
    } catch {
      setError('Die Karte konnte gerade nicht gelöscht werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  function ownerLabel(ownerUserId?: string | null) {
    if (!ownerUserId) return 'Noch nicht zugeordnet';
    return ownerOptions.find((option) => option.userId === ownerUserId)?.label ?? 'Noch nicht zugeordnet';
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
                  setDraft({ title: '', note: '', ownerUserId: null, focusLevel: null });
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="button primary" disabled={saving} onClick={() => createCard(category)}>Erstellen</button>
                <button type="button" className="button" onClick={() => { setActiveCategoryForCreate(null); setDraft(null); }}>Abbrechen</button>
              </div>
            </div>
          )}

          <div className="stack">
            {categoryCards.map((card) => (
              <div
                key={card.id}
                className="report-block stack"
                style={{ textAlign: 'left', border: '1px solid #ddd', background: mode === 'home' && card.focusLevel ? '#f6f2ff' : 'white' }}
              >
                <button type="button" className="button" style={{ alignSelf: 'flex-start' }} onClick={() => beginEdit(card)}>Details</button>
                <strong>{card.title}</strong>
                {card.note ? <p className="helper" style={{ margin: 0 }}>{card.note}</p> : null}

                {mode === 'dashboard' ? (
                  <button type="button" className="button" onClick={() => cycleOwner(card)} disabled={saving}>
                    {ownerLabel(card.ownerUserId)}
                  </button>
                ) : (
                  <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(['now', 'soon', 'later'] as OwnershipFocusLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`option-chip ${card.focusLevel === level ? 'selected' : ''}`}
                        onClick={() => setFocus(card, level)}
                        disabled={saving}
                      >
                        {focusLevelLabel[level]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
          {mode === 'dashboard' && (
            <select className="input" value={draft.ownerUserId ?? ''} onChange={(e) => setDraft({ ...draft, ownerUserId: e.target.value || null })}>
              <option value="">Noch nicht zugeordnet</option>
              {ownerOptions.map((option) => (
                <option key={option.userId} value={option.userId}>{option.label}</option>
              ))}
            </select>
          )}
          {mode === 'home' && (
            <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(['now', 'soon', 'later'] as OwnershipFocusLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`option-chip ${draft.focusLevel === level ? 'selected' : ''}`}
                  onClick={() => setDraft({ ...draft, focusLevel: draft.focusLevel === level ? null : level })}
                >
                  {focusLevelLabel[level]}
                </button>
              ))}
            </div>
          )}
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
