'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { CatalogViewModal } from '@/components/responsibilities/CatalogViewModal';
import { FamilyCardFormModal } from '@/components/responsibilities/FamilyCardFormModal';
import { FamilyCategorySection } from '@/components/responsibilities/FamilyCategorySection';
import { getCatalogCards } from '@/services/catalog.service';
import { createCustomCard, observeFamilyCards } from '@/services/familyResponsibility.service';
import { categoryLabelMap, isKnownQuizCategory, resolveCategoryLabel } from '@/services/resultCalculator';
import type { CatalogResponsibilityCard, FamilyResponsibilityCard, ResponsibilityCatalogLanguage } from '@/types/responsibility-cards';
import type { QuizCategory } from '@/types/quiz';

interface FamilyCategoryViewProps {
  familyId: string;
  userId: string;
  language: ResponsibilityCatalogLanguage;
}

export function FamilyCategoryView({ familyId, userId, language }: FamilyCategoryViewProps) {
  const [familyCards, setFamilyCards] = useState<FamilyResponsibilityCard[]>([]);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogCards, setCatalogCards] = useState<CatalogResponsibilityCard[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<QuizCategory | null>(null);
  const [createCategory, setCreateCategory] = useState<QuizCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const categoryKeys = useMemo(() => Object.keys(categoryLabelMap) as QuizCategory[], []);

  const groupedCards = useMemo(() => {
    const grouped = new Map<QuizCategory, FamilyResponsibilityCard[]>();
    categoryKeys.forEach((categoryKey) => grouped.set(categoryKey, []));

    familyCards
      .filter((card) => isKnownQuizCategory(card.categoryKey))
      .forEach((card) => {
        const category = card.categoryKey as QuizCategory;
        const cards = grouped.get(category) ?? [];
        cards.push(card);
        grouped.set(category, cards);
      });

    return [...grouped.entries()]
      .map(([categoryKey, cards]) => ({ categoryKey, cards }))
      .sort((left, right) => resolveCategoryLabel(left.categoryKey).localeCompare(resolveCategoryLabel(right.categoryKey)));
  }, [familyCards, categoryKeys]);

  const activeFamilyCardsForCatalog = useMemo(() => {
    if (!catalogCategory) return [];
    return familyCards.filter((card) => card.categoryKey === catalogCategory);
  }, [catalogCategory, familyCards]);

  useEffect(() => observeFamilyCards(
    familyId,
    (cards) => {
      setFamilyCards(cards);
      setLoadError(null);
    },
    () => {
      setLoadError('Die Familien-Karten konnten gerade nicht geladen werden. Bitte versuche es erneut.');
    },
  ), [familyId]);

  const openCatalog = useCallback(async (categoryKey: QuizCategory) => {
    setCatalogCategory(categoryKey);
    setCatalogCards([]);
    setCatalogError(null);
    setCatalogLoading(true);
    setIsCatalogOpen(true);

    try {
      const cards = await getCatalogCards(categoryKey, language);
      setCatalogCards(cards);
    } catch {
      setCatalogError('Der Katalog konnte gerade nicht geladen werden. Bitte versuche es erneut.');
    } finally {
      setCatalogLoading(false);
    }
  }, [language]);

  async function handleCreate(payload: { title: string; description: string }) {
    if (!createCategory) return;

    setIsCreating(true);
    try {
      await createCustomCard(familyId, createCategory, payload.title, payload.description, userId);
      setCreateCategory(null);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="stack">
      {groupedCards.map((group) => (
        <FamilyCategorySection
          key={group.categoryKey}
          categoryKey={group.categoryKey}
          cards={group.cards}
          onOpenCatalog={() => void openCatalog(group.categoryKey)}
          onCreateCard={() => setCreateCategory(group.categoryKey)}
        />
      ))}

      <CatalogViewModal
        isOpen={isCatalogOpen}
        onClose={() => {
          setIsCatalogOpen(false);
          setCatalogCategory(null);
          setCatalogCards([]);
          setCatalogError(null);
        }}
        familyId={familyId}
        userId={userId}
        categoryKey={catalogCategory}
        isLoading={catalogLoading}
        error={catalogError}
        catalogCards={catalogCards}
        familyCards={activeFamilyCardsForCatalog}
        onImported={async () => undefined}
      />

      <FamilyCardFormModal
        isOpen={Boolean(createCategory)}
        categoryKey={createCategory}
        isSaving={isCreating}
        onClose={() => setCreateCategory(null)}
        onSubmit={handleCreate}
      />

      {loadError ? <p className="inline-error">{loadError}</p> : null}
    </section>
  );
}
