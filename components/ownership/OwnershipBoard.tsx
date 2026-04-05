'use client';

import { MouseEvent, useEffect, useMemo, useState } from 'react';

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

interface DraftState {
  title: string;
  note: string;
}

type StatusFilter = 'all' | 'active' | 'open';

function focusTone(level?: OwnershipFocusLevel | null) {
  if (level === 'now') return '#ece5ff';
  if (level === 'soon') return '#f3eeff';
  if (level === 'later') return '#faf7ff';
  return 'white';
}

function resolveCardIsActive(card: OwnershipCardDocument) {
  if (typeof card.isActive === 'boolean') return card.isActive;
  return Boolean(card.ownerUserId || card.focusLevel);
}

export function OwnershipBoard({ familyId, currentUserId, cards, mode, ownerOptions, categoryKeys = [] }: OwnershipBoardProps) {
  const [openedCardId, setOpenedCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryForCreate, setActiveCategoryForCreate] = useState<QuizCategory | null>(null);
  const [focusOverrides, setFocusOverrides] = useState<Record<string, OwnershipFocusLevel | null>>({});
  const [homeOrder, setHomeOrder] = useState<Record<string, number> | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | QuizCategory>('all');

  const openedCard = useMemo(() => cards.find((item) => item.id === openedCardId) ?? null, [cards, openedCardId]);

  const visibleCards = useMemo(() => {
    if (mode === 'home') {
      return cards.filter((card) => card.ownerUserId === currentUserId && resolveCardIsActive(card));
    }
    return cards;
  }, [cards, currentUserId, mode]);

  useEffect(() => {
    if (mode !== 'home' || homeOrder) return;
    if (!visibleCards.length) return;
    const indexMap: Record<string, number> = {};
    visibleCards.forEach((card, index) => {
      indexMap[card.id] = index;
    });
    setHomeOrder(indexMap);
  }, [mode, homeOrder, visibleCards]);

  function resolveFocus(card: OwnershipCardDocument) {
    if (focusOverrides[card.id] !== undefined) return focusOverrides[card.id];
    return card.focusLevel ?? null;
  }

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
      const sorted = [...list].sort((a, b) => {
        if (mode === 'home' && homeOrder) {
          return (homeOrder[a.id] ?? Number.MAX_SAFE_INTEGER) - (homeOrder[b.id] ?? Number.MAX_SAFE_INTEGER);
        }
        return a.sortOrder - b.sortOrder;
      });
      map.set(category, sorted);
    }

    return [...map.entries()].sort((a, b) => categoryLabelMap[a[0]].localeCompare(categoryLabelMap[b[0]]));
  }, [visibleCards, mode, categoryKeys, homeOrder]);

  const groupedWithStatus = useMemo(() => grouped.map(([category, categoryCards]) => ({
    category,
    total: categoryCards.length,
    active: categoryCards.filter(resolveCardIsActive).length,
    cards: categoryCards,
  })), [grouped]);

  const filteredGroups = useMemo(() => groupedWithStatus
    .filter((group) => categoryFilter === 'all' || group.category === categoryFilter)
    .map((group) => {
      const nextCards = group.cards.filter((card) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return resolveCardIsActive(card);
        return !resolveCardIsActive(card);
      });

      return {
        ...group,
        cards: nextCards,
      };
    }), [groupedWithStatus, categoryFilter, statusFilter]);

  function openDetails(card: OwnershipCardDocument) {
    setOpenedCardId(card.id);
    setDraft({
      title: card.title,
      note: card.note,
    });
    setError(null);
  }

  async function saveCardMeta(card: OwnershipCardDocument, next: DraftState) {
    await upsertOwnershipCard({
      familyId,
      cardId: card.id,
      actorUserId: currentUserId,
      payload: {
        categoryKey: card.categoryKey,
        title: next.title.trim() || card.title,
        note: next.note.trim(),
        ownerUserId: card.ownerUserId ?? null,
        focusLevel: card.focusLevel ?? null,
        isActive: resolveCardIsActive(card),
        sortOrder: card.sortOrder,
      },
    });
  }

  async function saveDetails(card: OwnershipCardDocument) {
    if (!draft) return;
    setSaving(true);
    setError(null);

    try {
      await saveCardMeta(card, draft);
      setOpenedCardId(null);
      setDraft(null);
    } catch {
      setError('Die Karte konnte gerade nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  async function setFocus(card: OwnershipCardDocument, level: OwnershipFocusLevel) {
    const nextLevel = resolveFocus(card) === level ? null : level;
    const previousLevel = resolveFocus(card);
    setFocusOverrides((prev) => ({ ...prev, [card.id]: nextLevel }));

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
          ownerUserId: card.ownerUserId ?? null,
          focusLevel: nextLevel,
          isActive: resolveCardIsActive(card),
          sortOrder: card.sortOrder,
        },
      });
    } catch {
      setFocusOverrides((prev) => ({ ...prev, [card.id]: previousLevel }));
      setError('Der Fokus konnte gerade nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  function ownerVisual(ownerUserId?: string | null) {
    const ownerIndex = ownerOptions.findIndex((option) => option.userId === ownerUserId);
    if (!ownerUserId || ownerIndex === -1) {
      return {
        label: 'Noch nicht zugeordnet',
        buttonBackground: '#ececec',
        buttonColor: '#414141',
        cardBackground: '#fafafa',
      };
    }

    const ownerLabel = ownerOptions.find((option) => option.userId === ownerUserId)?.label ?? 'Noch nicht zugeordnet';
    if (ownerIndex === 0) {
      return {
        label: ownerLabel,
        buttonBackground: '#6850db',
        buttonColor: '#ffffff',
        cardBackground: '#f2edff',
      };
    }

    return {
      label: ownerLabel,
      buttonBackground: '#1f5f5a',
      buttonColor: '#ffffff',
      cardBackground: '#eaf6f4',
    };
  }

  async function cycleOwner(card: OwnershipCardDocument, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
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
          isActive: resolveCardIsActive(card),
          sortOrder: card.sortOrder,
        },
      });
    } catch {
      setError('Die Zuordnung konnte gerade nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  async function setCardActivation(card: OwnershipCardDocument, nextActive: boolean, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
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
          ownerUserId: card.ownerUserId ?? null,
          focusLevel: card.focusLevel ?? null,
          isActive: nextActive,
          sortOrder: card.sortOrder,
        },
      });
    } catch {
      setError('Der Aktivierungsstatus konnte gerade nicht gespeichert werden. Bitte versuche es erneut.');
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
          isActive: false,
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

  return (
    <div className="stack">
      {mode === 'dashboard' && (
        <article className="card stack">
          <h3 className="card-title" style={{ margin: 0 }}>Filter</h3>
          <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {([
              { key: 'all', label: 'Alle' },
              { key: 'active', label: 'Aktiviert' },
              { key: 'open', label: 'Noch offen' },
            ] as Array<{ key: StatusFilter; label: string }>).map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`option-chip ${statusFilter === entry.key ? 'selected' : ''}`}
                onClick={() => setStatusFilter(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className={`option-chip ${categoryFilter === 'all' ? 'selected' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              Alle Aufgabengebiete
            </button>
            {groupedWithStatus.map((group) => (
              <button
                key={group.category}
                type="button"
                className={`option-chip ${categoryFilter === group.category ? 'selected' : ''}`}
                onClick={() => setCategoryFilter(group.category)}
              >
                {categoryLabelMap[group.category]}
              </button>
            ))}
          </div>
        </article>
      )}

      {filteredGroups.map((group) => (
        <article key={group.category} className="card stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h3 className="card-title" style={{ margin: 0 }}>{categoryLabelMap[group.category]}</h3>
            <span className="helper" style={{ margin: 0 }}>{group.active} aktiviert von {group.total}</span>
            {mode === 'dashboard' && (
              <button
                type="button"
                className="button"
                onClick={() => {
                  setActiveCategoryForCreate(group.category);
                  setDraft({ title: '', note: '' });
                }}
              >
                Neue Karte
              </button>
            )}
          </div>

          {activeCategoryForCreate === group.category && draft && mode === 'dashboard' && (
            <div className="report-block stack">
              <p className="helper" style={{ margin: 0 }}>Neue lokale Karte in dieser Kategorie.</p>
              <input className="input" value={draft.title} placeholder="Titel" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <textarea className="input" rows={3} value={draft.note} placeholder="Notiz" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="button primary" disabled={saving} onClick={() => createCard(group.category)}>Erstellen</button>
                <button type="button" className="button" onClick={() => { setActiveCategoryForCreate(null); setDraft(null); }}>Abbrechen</button>
              </div>
            </div>
          )}

          <div className="stack">
            {group.cards.map((card) => {
              const focusLevel = resolveFocus(card);
              const ownerStyle = ownerVisual(card.ownerUserId);
              const isActive = resolveCardIsActive(card);
              return (
                <div
                  key={card.id}
                  className="report-block stack"
                  style={{
                    textAlign: 'left',
                    border: '1px solid #ddd',
                    background: mode === 'dashboard' ? ownerStyle.cardBackground : focusTone(focusLevel),
                    cursor: 'pointer',
                  }}
                  onClick={() => openDetails(card)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openDetails(card);
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{card.title}</strong>
                    <span className="helper" style={{ margin: 0, border: '1px solid #d6d6d6', borderRadius: 999, padding: '2px 10px' }}>
                      {isActive ? 'Aktiviert' : 'Noch nicht aktiviert'}
                    </span>
                  </div>
                  {card.note ? <p className="helper" style={{ margin: 0 }}>{card.note}</p> : null}

                  {mode === 'dashboard' ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`button ${isActive ? '' : 'primary'}`}
                        onClick={(event) => setCardActivation(card, !isActive, event)}
                        disabled={saving}
                      >
                        {isActive ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                      <button
                        type="button"
                        className="button"
                        style={{ background: ownerStyle.buttonBackground, color: ownerStyle.buttonColor, borderColor: 'transparent' }}
                        onClick={(event) => cycleOwner(card, event)}
                        disabled={saving || !isActive}
                      >
                        {ownerStyle.label}
                      </button>
                    </div>
                  ) : (
                    <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} onClick={(event) => event.stopPropagation()}>
                      {(['now', 'soon', 'later'] as OwnershipFocusLevel[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          className={`option-chip ${focusLevel === level ? 'selected' : ''}`}
                          onClick={() => setFocus(card, level)}
                          disabled={saving}
                          style={
                            focusLevel === level
                              ? {
                                background: level === 'now' ? '#4b33c7' : level === 'soon' ? '#7b66e6' : '#d9d0ff',
                                color: level === 'later' ? '#31255a' : '#ffffff',
                              }
                              : undefined
                          }
                        >
                          {focusLevelLabel[level]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!group.cards.length && <p className="helper">Für diesen Filterzustand gibt es hier keine Karten.</p>}
          </div>
        </article>
      ))}

      {!filteredGroups.length && (
        <p className="helper">
          {mode === 'home'
            ? 'Es sind aktuell keine aktivierten Karten dir zugeordnet.'
            : 'Noch keine Aufgabengebiete aktiviert.'}
        </p>
      )}
      {error && <p className="inline-error">{error}</p>}

      {openedCard && draft && (
        <div className="card stack" style={{ position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 30, maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>
          <h3 className="card-title" style={{ margin: 0 }}>{categoryLabelMap[openedCard.categoryKey]}</h3>
          <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="input" rows={4} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="button primary" disabled={saving} onClick={() => saveDetails(openedCard)}>Speichern</button>
            {mode === 'dashboard' && <button type="button" className="button" disabled={saving} onClick={() => deleteCard(openedCard.id)}>Löschen</button>}
            <button type="button" className="button" onClick={() => { setOpenedCardId(null); setDraft(null); }}>Schließen</button>
          </div>
        </div>
      )}
    </div>
  );
}
