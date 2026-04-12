'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { isKnownQuizCategory, resolveCategoryLabel } from '@/services/resultCalculator';
import {
  createOwnershipCard,
  softDeleteOwnershipCard,
  updateOwnershipCardFocus,
  updateOwnershipCardMeta,
  updateOwnershipCardOwner,
} from '@/services/ownership.service';
import type { OwnershipCardDocument, OwnershipFocusLevel } from '@/types/ownership';
import type { AgeGroup, QuizCategory } from '@/types/quiz';

interface OwnershipBoardProps {
  familyId: string;
  currentUserId: string;
  cards: OwnershipCardDocument[];
  mode: 'dashboard' | 'home';
  ownerOptions: Array<{ userId: string; label: string }>;
  categoryKeys?: QuizCategory[];
  preselectedCategoryKeys?: QuizCategory[];
  ageGroup?: AgeGroup | null;
  isFocusedEntry?: boolean;
  onOpenTasks?: (card: OwnershipCardDocument) => void;
  taskCountByCard?: Record<string, number>;
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

function focusTone(level?: OwnershipFocusLevel | null) {
  if (level === 'now') return '#ece5ff';
  if (level === 'soon') return '#f3eeff';
  if (level === 'later') return '#faf7ff';
  return '#ffffff';
}

function cardAccent(level?: OwnershipFocusLevel | null) {
  if (level === 'now') return '#7c5cfa';
  if (level === 'soon') return '#2f6f6d';
  if (level === 'later') return '#d6cbff';
  return '#d7ddd7';
}

function ownerVisual(
  ownerUserId: string | null | undefined,
  ownerOptions: Array<{ userId: string; label: string }>,
) {
  const ownerIndex = ownerOptions.findIndex((option) => option.userId === ownerUserId);
  if (!ownerUserId || ownerIndex === -1) {
    return {
      label: 'Noch nicht zugeordnet',
      background: 'linear-gradient(135deg, #f1efe9 0%, #e6e0d6 100%)',
      cardBackground: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(243,239,232,0.98) 100%)',
      color: '#4f5a66',
      borderColor: 'rgba(206, 198, 185, 0.95)',
    };
  }

  if (ownerIndex === 0) {
    return {
      label: ownerOptions[ownerIndex]?.label ?? 'Ich',
      background: 'linear-gradient(135deg, #2f6f6d 0%, #4f9995 100%)',
      cardBackground: 'linear-gradient(180deg, rgba(240,250,248,0.98) 0%, rgba(223,239,236,0.98) 100%)',
      color: '#ffffff',
      borderColor: 'rgba(47, 111, 109, 0.95)',
    };
  }

  return {
    label: ownerOptions[ownerIndex]?.label ?? 'Partner',
    background: 'linear-gradient(135deg, #7c5cfa 0%, #9a85ff 100%)',
    cardBackground: 'linear-gradient(180deg, rgba(246,243,255,0.98) 0%, rgba(232,225,255,0.98) 100%)',
    color: '#ffffff',
    borderColor: 'rgba(124, 92, 250, 0.95)',
  };
}

function resolveCardIsActive(card: OwnershipCardDocument) {
  return Boolean(card.isActive || card.ownerUserId || card.focusLevel);
}

function areCategoryListsEqual(left: QuizCategory[], right: QuizCategory[]) {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry === right[index]);
}

function TaskBadgeIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 5h8" />
      <path d="M6 10h8" />
      <path d="M6 15h5" />
      <circle cx="4" cy="5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="4" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="4" cy="15" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function OwnershipBoard({
  familyId,
  currentUserId,
  cards,
  mode,
  ownerOptions,
  categoryKeys = [],
  preselectedCategoryKeys = [],
  ageGroup,
  onOpenTasks,
  taskCountByCard = {},
}: OwnershipBoardProps) {
  const [openedCardId, setOpenedCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategoryForCreate, setActiveCategoryForCreate] = useState<QuizCategory | null>(null);
  const [focusOverrides, setFocusOverrides] = useState<Record<string, OwnershipFocusLevel | null>>({});
  const [homeOrder, setHomeOrder] = useState<Record<string, number> | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<QuizCategory[]>([]);
  const hasAppliedInitialFilter = useRef(false);

  const openedCard = useMemo(() => cards.find((item) => item.id === openedCardId) ?? null, [cards, openedCardId]);

  const visibleCards = useMemo(() => {
    const validCards = cards.filter((card) => isKnownQuizCategory(card.categoryKey));
    if (mode === 'home') {
      return validCards.filter((card) => card.ownerUserId === currentUserId && resolveCardIsActive(card));
    }
    return validCards;
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

    return [...map.entries()].sort((a, b) => resolveCategoryLabel(a[0], ageGroup ?? undefined).localeCompare(resolveCategoryLabel(b[0], ageGroup ?? undefined)));
  }, [visibleCards, mode, categoryKeys, homeOrder, ageGroup]);

  const groupedWithStatus = useMemo(() => grouped.map(([category, categoryCards]) => ({
    category,
    total: categoryCards.length,
    active: categoryCards.filter(resolveCardIsActive).length,
    cards: categoryCards,
  })), [grouped]);

  useEffect(() => {
    if (mode !== 'dashboard') return;
    if (!selectedCategories.length) return;
    const validSet = new Set(groupedWithStatus.map((group) => group.category));
    const next = selectedCategories.filter((category) => validSet.has(category));
    if (!areCategoryListsEqual(next, selectedCategories)) {
      setSelectedCategories(next);
    }
  }, [mode, selectedCategories, groupedWithStatus]);

  useEffect(() => {
    if (mode !== 'dashboard' || hasAppliedInitialFilter.current) return;
    if (!preselectedCategoryKeys.length || !groupedWithStatus.length) return;
    const validSet = new Set(groupedWithStatus.map((group) => group.category));
    const initial = preselectedCategoryKeys.filter((category) => validSet.has(category));
    if (!initial.length) return;
    setSelectedCategories(initial);
    hasAppliedInitialFilter.current = true;
  }, [mode, preselectedCategoryKeys, groupedWithStatus]);

  const filteredGroups = useMemo(() => groupedWithStatus
    .filter((group) => {
      if (mode !== 'dashboard') return true;
      if (!selectedCategories.length) return true;
      return selectedCategories.includes(group.category);
    }),
  [groupedWithStatus, selectedCategories, mode]);

  function openDetails(card: OwnershipCardDocument) {
    const isSameCard = openedCardId === card.id;
    setOpenedCardId(isSameCard ? null : card.id);
    setDraft(isSameCard ? null : {
      title: card.title,
      note: card.note,
    });
    setError(null);
  }

  async function saveCardMeta(card: OwnershipCardDocument, next: DraftState) {
    await updateOwnershipCardMeta({
      familyId,
      cardId: card.id,
      actorUserId: currentUserId,
      patch: {
        title: next.title.trim() || card.title,
        note: next.note.trim(),
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
      await updateOwnershipCardFocus({
        familyId,
        cardId: card.id,
        actorUserId: currentUserId,
        patch: { focusLevel: nextLevel },
      });
    } catch {
      setFocusOverrides((prev) => ({ ...prev, [card.id]: previousLevel }));
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
      await updateOwnershipCardOwner({
        familyId,
        cardId: card.id,
        actorUserId: currentUserId,
        patch: { ownerUserId: nextOwner },
      });
    } catch {
      setError('Die Zuordnung konnte gerade nicht gespeichert werden. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(category: QuizCategory) {
    setSelectedCategories((current) => (
      current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category]
    ));
  }

  async function createCard(categoryKey: QuizCategory) {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await createOwnershipCard({
        familyId,
        actorUserId: currentUserId,
        payload: {
          categoryKey,
          title: draft.title.trim() || 'Verantwortungsbereich planen und umsetzen',
          note: draft.note.trim(),
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
        <article className="card stack ownership-filter-shell">
          <h3 className="card-title" style={{ margin: 0 }}>Filter</h3>
          <div className="chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {groupedWithStatus.map((group) => (
              <button
                key={group.category}
                type="button"
                className={`option-chip ${selectedCategories.includes(group.category) ? 'selected' : ''}`}
                onClick={() => toggleCategory(group.category)}
              >
                {resolveCategoryLabel(group.category, ageGroup ?? undefined)}
              </button>
            ))}
          </div>
        </article>
      )}

      {filteredGroups.map((group) => (
        <article key={group.category} className="card stack ownership-category-shell">
          <div className="ownership-group-header">
            <div className="ownership-group-heading">
              <h3 className="card-title" style={{ margin: 0 }}>{resolveCategoryLabel(group.category, ageGroup ?? undefined)}</h3>
              <span className="helper ownership-group-meta">{group.active} zugeordnet von {group.total}</span>
            </div>
            {mode === 'dashboard' && (
              <button
                type="button"
                className="button ownership-create-button"
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
            <div className="report-block stack ownership-create-panel">
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
              const ownerState = ownerVisual(card.ownerUserId, ownerOptions);
              const taskCount = taskCountByCard[card.id] ?? 0;
              return (
                <div
                  key={card.id}
                  className="ownership-card stack"
                  style={{
                    background: mode === 'dashboard'
                      ? ownerState.cardBackground
                      : focusTone(focusLevel),
                    ['--ownership-accent' as string]: cardAccent(focusLevel),
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
                  onPointerDown={(event) => {
                    event.preventDefault();
                  }}
                >
                  <div className="ownership-card-topline">
                    <span className="ownership-card-kicker">{resolveCategoryLabel(card.categoryKey, ageGroup ?? undefined)}</span>
                    <div className="ownership-card-topline-actions">
                      {mode !== 'dashboard' && focusLevel ? <span className="ownership-card-focus">{focusLevelLabel[focusLevel]}</span> : null}
                      {taskCount > 0 && onOpenTasks ? (
                        <button
                          type="button"
                          className="ownership-task-indicator"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenTasks(card);
                          }}
                          aria-label={`${taskCount} ${taskCount === 1 ? 'Aufgabe' : 'Aufgaben'} für ${card.title} öffnen`}
                        >
                          <TaskBadgeIcon />
                          <span>{taskCount}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <strong className="ownership-card-title">{card.title}</strong>
                  {card.note ? <p className="helper ownership-card-note" style={{ margin: 0 }}>{card.note}</p> : null}

                  {mode === 'dashboard' ? (
                    <div onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="ownership-owner-button"
                        onClick={() => cycleOwner(card)}
                        disabled={saving}
                        style={{
                          background: ownerState.background,
                          color: ownerState.color,
                          borderColor: ownerState.borderColor,
                        }}
                      >
                        {ownerState.label}
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
            : 'Noch keine Verantwortungsgebiete aktiviert.'}
        </p>
      )}
      {error && <p className="inline-error">{error}</p>}

      {openedCard && draft && (
        <div
          className="ownership-modal-backdrop"
          onClick={() => { setOpenedCardId(null); setDraft(null); }}
          role="presentation"
        >
          <div
            className="card stack ownership-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Karte bearbeiten"
          >
            <div className="ownership-modal-header">
              <div className="stack" style={{ gap: 6 }}>
                <span className="ownership-card-kicker">{resolveCategoryLabel(openedCard.categoryKey, ageGroup ?? undefined)}</span>
                <h3 className="card-title" style={{ margin: 0 }}>Karte bearbeiten</h3>
              </div>
              <button type="button" className="ownership-modal-close" onClick={() => { setOpenedCardId(null); setDraft(null); }}>
                Schließen
              </button>
            </div>
            <input className="input ownership-modal-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <textarea className="input ownership-modal-input" rows={5} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            <div className="ownership-modal-actions">
              <button type="button" className="button primary" disabled={saving} onClick={() => saveDetails(openedCard)}>Speichern</button>
              {mode === 'dashboard' && (
                <button type="button" className="button" disabled={saving} onClick={() => deleteCard(openedCard.id)}>Löschen</button>
              )}
              <button type="button" className="button secondary" onClick={() => { setOpenedCardId(null); setDraft(null); }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
