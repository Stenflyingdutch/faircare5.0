'use client';

import { useCallback, useEffect, useState } from 'react';

import { CatalogViewModal } from '@/components/responsibilities/CatalogViewModal';
import { ResponsibilityHeaderActions } from '@/components/responsibilities/ResponsibilityHeaderActions';
import { getCatalogCards } from '@/services/catalog.service';
import { createCustomCard, getFamilyCards } from '@/services/familyResponsibility.service';
import type { CatalogResponsibilityCard, FamilyResponsibilityCard, ResponsibilityCatalogLanguage } from '@/types/responsibility-cards';

interface FamilyCategoryViewProps {
  familyId: string;
  userId: string;
  categoryKey: string;
  language: ResponsibilityCatalogLanguage;
}

export function FamilyCategoryView({ familyId, userId, categoryKey, language }: FamilyCategoryViewProps) {
  const [familyCards, setFamilyCards] = useState<FamilyResponsibilityCard[]>([]);
  const [catalogCards, setCatalogCards] = useState<CatalogResponsibilityCard[]>([]);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');

  const reloadFamilyCards = useCallback(async () => {
    const cards = await getFamilyCards(familyId, categoryKey);
    setFamilyCards(cards);
  }, [familyId, categoryKey]);

  const reloadCatalogCards = useCallback(async () => {
    const cards = await getCatalogCards(categoryKey, language);
    setCatalogCards(cards);
  }, [categoryKey, language]);

  useEffect(() => {
    void reloadFamilyCards();
    void reloadCatalogCards();
  }, [reloadCatalogCards, reloadFamilyCards]);

  async function handleCreateCard() {
    if (!newCardTitle.trim()) return;
    await createCustomCard(familyId, categoryKey, newCardTitle, newCardDescription, userId);
    setNewCardTitle('');
    setNewCardDescription('');
    await reloadFamilyCards();
  }

  return (
    <section className="stack-md">
      <header className="row between center">
        <div>
          <h2>{categoryKey}</h2>
          <p className="helper">{familyCards.length} Karten</p>
        </div>
        <ResponsibilityHeaderActions onOpenCatalog={() => setIsCatalogOpen(true)} onCreateCard={handleCreateCard} />
      </header>

      {familyCards.length === 0 ? (
        <div className="card-surface stack-sm">
          <p>Hier sind noch keine Verantwortungsgebiete in eurer Liste.</p>
          <ResponsibilityHeaderActions
            onOpenCatalog={() => setIsCatalogOpen(true)}
            onCreateCard={handleCreateCard}
            catalogLabel="Katalog öffnen"
          />
        </div>
      ) : (
        <div className="stack-sm">
          {familyCards.map((card) => (
            <article key={card.id} className="card-surface stack-xs">
              <strong>{card.title}</strong>
              <p>{card.description}</p>
              <p className="helper">Status: {card.status} · Fokus: {card.focusState ?? '–'}</p>
            </article>
          ))}
        </div>
      )}

      <div className="stack-xs">
        <input
          value={newCardTitle}
          onChange={(event) => setNewCardTitle(event.target.value)}
          placeholder="Titel"
        />
        <textarea
          value={newCardDescription}
          onChange={(event) => setNewCardDescription(event.target.value)}
          placeholder="Beschreibung"
        />
      </div>

      <CatalogViewModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        familyId={familyId}
        userId={userId}
        catalogCards={catalogCards}
        familyCards={familyCards}
        onImported={reloadFamilyCards}
      />
    </section>
  );
}
