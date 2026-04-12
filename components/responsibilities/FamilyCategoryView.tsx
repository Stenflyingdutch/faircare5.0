'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ResponsibilityCatalogModal } from '@/components/responsibilities/CatalogViewModal';
import { FamilyCardCreateModal } from '@/components/responsibilities/FamilyCardCreateModal';
import { FamilyCategoryActions } from '@/components/responsibilities/FamilyCategoryActions';
import { FamilyResponsibilityCardList } from '@/components/responsibilities/FamilyResponsibilityCardList';
import { getCatalogCards } from '@/services/catalog.service';
import { createCustomCard, observeFamilyCards } from '@/services/familyResponsibility.service';
import { resolveCategoryLabel } from '@/services/resultCalculator';
import type { CatalogResponsibilityCard, FamilyResponsibilityCard, ResponsibilityCatalogLanguage } from '@/types/responsibility-cards';
import type { QuizCategory } from '@/types/quiz';

interface FamilyCategoryViewProps {
  familyId: string;
  userId: string;
  categoryKeys: QuizCategory[];
  language: ResponsibilityCatalogLanguage;
}

export function FamilyCategoryView({ familyId, userId, categoryKeys, language }: FamilyCategoryViewProps) {
  const [familyCards, setFamilyCards] = useState<FamilyResponsibilityCard[]>([]);
  const [catalogCards, setCatalogCards] = useState<CatalogResponsibilityCard[]>([]);
  const [activeCategory, setActiveCategory] = useState<QuizCategory | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => observeFamilyCards(familyId, setFamilyCards), [familyId]);

  const cardsByCategory = useMemo(() => {
    const map = new Map<QuizCategory, FamilyResponsibilityCard[]>();
    categoryKeys.forEach((key) => map.set(key, []));
    familyCards.forEach((card) => {
      if (!categoryKeys.includes(card.categoryKey as QuizCategory)) return;
      const list = map.get(card.categoryKey as QuizCategory) ?? [];
      list.push(card);
      map.set(card.categoryKey as QuizCategory, list);
    });
    return map;
  }, [categoryKeys, familyCards]);

  const loadCatalogCards = useCallback(async (categoryKey: QuizCategory) => {
    const cards = await getCatalogCards(categoryKey, language);
    setCatalogCards(cards);
  }, [language]);

  async function openCatalog(categoryKey: QuizCategory) {
    setActiveCategory(categoryKey);
    setIsCatalogOpen(true);
    await loadCatalogCards(categoryKey);
  }

  async function createCardForActiveCategory(title: string, description: string) {
    if (!activeCategory) return;
    await createCustomCard(familyId, activeCategory, title, description, userId);
  }

  return (
    <section className="stack">
      {categoryKeys.map((categoryKey) => {
        const cards = cardsByCategory.get(categoryKey) ?? [];
        const categoryLabel = resolveCategoryLabel(categoryKey);

        return (
          <article key={categoryKey} className="card stack ownership-category-shell">
            <header className="ownership-group-header">
              <div className="ownership-group-heading">
                <h2 className="card-title" style={{ margin: 0 }}>{categoryLabel}</h2>
                <p className="helper ownership-group-meta" style={{ margin: 0 }}>{cards.length} Karten</p>
              </div>
              <FamilyCategoryActions
                onOpenCatalog={() => void openCatalog(categoryKey)}
                onCreateCard={() => {
                  setActiveCategory(categoryKey);
                  setIsCreateOpen(true);
                }}
              />
            </header>

            {cards.length === 0
              ? <p className="helper">In dieser Kategorie gibt es noch keine Familien-Karten.</p>
              : <FamilyResponsibilityCardList cards={cards} />}
          </article>
        );
      })}

      {activeCategory && (
        <ResponsibilityCatalogModal
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          familyId={familyId}
          userId={userId}
          categoryLabel={resolveCategoryLabel(activeCategory)}
          catalogCards={catalogCards}
          familyCards={familyCards.filter((card) => card.categoryKey === activeCategory)}
          onImported={async () => undefined}
        />
      )}

      <FamilyCardCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={createCardForActiveCategory}
      />
    </section>
  );
}
