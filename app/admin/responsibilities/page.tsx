'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import {
  createCatalogCard,
  deleteCatalogCard,
  getCatalogCardsForAdmin,
} from '@/services/adminCatalog.service';
import { observeAuthState } from '@/services/auth.service';
import type {
  CatalogResponsibilityCard,
  ResponsibilityCatalogAgeGroup,
  ResponsibilityCatalogLanguage,
} from '@/types/responsibility-cards';

const ageGroups: ResponsibilityCatalogAgeGroup[] = ['0-1', '1-3', '3-6', '6-12', '12-18'];
const languages: ResponsibilityCatalogLanguage[] = ['de', 'en', 'nl'];

type LoadState = 'loading' | 'success' | 'empty' | 'error';

export default function AdminResponsibilitiesPage() {
  const [cards, setCards] = useState<CatalogResponsibilityCard[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState<ResponsibilityCatalogLanguage>('de');
  const [ageGroupFilter, setAgeGroupFilter] = useState<ResponsibilityCatalogAgeGroup>('3-6');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('betreuung_entwicklung');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const loadCards = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const loadedCards = await getCatalogCardsForAdmin({
        categoryKey: categoryFilter,
        language: languageFilter,
        ageGroup: ageGroupFilter,
      });
      setCards(loadedCards);
      setLoadState(loadedCards.length === 0 ? 'empty' : 'success');
    } catch {
      setCards([]);
      setLoadState('error');
      setLoadError('Katalog konnte nicht geladen werden.');
    }
  }, [ageGroupFilter, categoryFilter, languageFilter]);

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      setUserId(user?.uid ?? '');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const categories = useMemo(() => {
    return Array.from(new Set(cards.map((card) => card.categoryKey))).sort();
  }, [cards]);

  async function handleCreate() {
    if (!userId || !newTitle.trim()) return;
    await createCatalogCard({
      categoryKey: newCategory,
      title: newTitle.trim(),
      description: newDescription.trim(),
      language: languageFilter,
      ageGroup: ageGroupFilter,
      sortOrder: cards.length + 1,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
      tags: [],
      version: 1,
    }, userId);
    setNewTitle('');
    setNewDescription('');
    await loadCards();
  }

  async function handleDelete(cardId: string) {
    await deleteCatalogCard(cardId);
    await loadCards();
  }

  return (
    <div className="admin-page-stack">
      <AdminPageHeader
        title="Admin → Verantwortungsbereiche"
        description="Zentraler Katalog für Verantwortungs-Karten mit Filterung nach Kategorie, Sprache und Altersgruppe."
      />

      <p className="helper">
        Änderungen wirken nur auf den zentralen Katalog. Bereits übernommene Karten bleiben unverändert.
      </p>

      <div className="responsibility-filter-row">
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">Alle Kategorien</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value as ResponsibilityCatalogLanguage)}>
          {languages.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
        <select value={ageGroupFilter} onChange={(event) => setAgeGroupFilter(event.target.value as ResponsibilityCatalogAgeGroup)}>
          {ageGroups.map((ageGroup) => <option key={ageGroup} value={ageGroup}>{ageGroup}</option>)}
        </select>
      </div>

      <div className="card-surface stack-xs responsibility-create-card">
        <h3>Neue Katalog-Karte</h3>
        <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Kategorie" />
        <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Titel" />
        <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Beschreibung" />
        <button type="button" className="btn-primary" onClick={handleCreate}>Neue Karte</button>
      </div>

      {loadState === 'loading' ? <p className="helper">Katalog wird geladen…</p> : null}

      {loadState === 'empty' ? <p className="helper">Für diese Auswahl gibt es noch keine Katalog-Karten.</p> : null}

      {loadState === 'success' ? (
        <div className="stack-sm">
          {cards.map((card) => (
            <article key={card.id} className="card-surface stack-xs">
              <strong>{card.title}</strong>
              <p>{card.description}</p>
              <p className="helper">{card.categoryKey} · {card.language} · {card.ageGroup}</p>
              <div className="row gap-sm">
                <button type="button" className="btn-secondary" onClick={() => handleDelete(card.id)}>Löschen</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {loadState === 'error' && loadError ? <p className="inline-error">{loadError}</p> : null}
    </div>
  );
}
