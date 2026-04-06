'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import type { QuizCategory } from '@/types/quiz';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import {
  listenToResponsibilitiesForUser,
  extractRelevantCategories,
  sortCategoriesByRelevance,
  sortResponsibilities,
  updateResponsibilityPriority,
  type Responsibility,
  type ResponsibilityPriority,
} from '@/services/responsibilities.service';
import { HomeHeader } from '@/components/home/HomeHeader';
import { CategoryFilterButtons } from '@/components/home/CategoryFilterButtons';
import { SortToggle } from '@/components/home/SortToggle';
import { ResponsibilityCard } from '@/components/home/ResponsibilityCard';
import { ResponsibilityCardDetails } from '@/components/home/ResponsibilityCardDetails';
import { SkeletonCategoryCard } from '@/components/home/SkeletonCategoryCard';
import { categoryLabelMap } from '@/services/resultCalculator';

type SortMode = 'relevance' | 'area';

function sortResponsibilitiesForMode(items: Responsibility[], mode: SortMode) {
  if (mode === 'area') {
    return [...items].sort((a, b) => {
      const labelA = categoryLabelMap[a.categoryKey] || a.categoryKey;
      const labelB = categoryLabelMap[b.categoryKey] || b.categoryKey;
      if (labelA !== labelB) return labelA.localeCompare(labelB);
      if (a.priority !== b.priority) return a.priority === 'act' ? -1 : b.priority === 'act' ? 1 : a.priority === 'plan' ? -1 : 1;
      return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    });
  }
  return sortResponsibilities(items);
}

export default function PersonalHomePage() {
  const router = useRouter();
  const [userFirstName, setUserFirstName] = useState('');
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [activeFilter, setActiveFilter] = useState<QuizCategory | 'all' | null>('all');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [orderedResponsibilityIds, setOrderedResponsibilityIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const previousSortMode = useRef<SortMode>('relevance');

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.uid);

      const bundle = await fetchDashboardBundle(user.uid);
      setUserFirstName(bundle.profile?.displayName?.split(' ')[0] || '');
      setFamilyId(bundle.profile?.familyId ?? null);

      if (bundle.profile?.familyId) {
        listenToResponsibilitiesForUser(
          bundle.profile.familyId,
          user.uid,
          (data) => {
            setResponsibilities(data);
            setIsLoading(false);
          },
          () => {
            setIsLoading(false);
          },
        );
      }
    });
    return () => unsubscribe();
  }, [router]);

  const relevantCategories = useMemo(
    () => sortCategoriesByRelevance(extractRelevantCategories(responsibilities), responsibilities),
    [responsibilities],
  );

  useEffect(() => {
    if (isLoading) return;

    const currentIds = responsibilities.map((item) => item.id);
    const needsSort = orderedResponsibilityIds.length === 0 || previousSortMode.current !== sortMode;

    if (needsSort) {
      const sorted = sortResponsibilitiesForMode(responsibilities, sortMode).map((item) => item.id);
      setOrderedResponsibilityIds(sorted);
      previousSortMode.current = sortMode;
      return;
    }

    const existingIds = orderedResponsibilityIds.filter((id) => currentIds.includes(id));
    const newIds = currentIds.filter((id) => !existingIds.includes(id));
    if (newIds.length || existingIds.length !== orderedResponsibilityIds.length) {
      setOrderedResponsibilityIds([...existingIds, ...newIds]);
    }
  }, [responsibilities, sortMode, isLoading, orderedResponsibilityIds]);

  const responsibilityMap = useMemo(
    () => new Map(responsibilities.map((item) => [item.id, item])),
    [responsibilities],
  );

  const sortedResponsibilities = useMemo(
    () => orderedResponsibilityIds
      .map((id) => responsibilityMap.get(id))
      .filter((item): item is Responsibility => Boolean(item)),
    [orderedResponsibilityIds, responsibilityMap],
  );

  const filteredResponsibilities = useMemo(() => {
    if (activeFilter === 'all' || !activeFilter) return sortedResponsibilities;
    return sortedResponsibilities.filter((item) => item.categoryKey === activeFilter);
  }, [sortedResponsibilities, activeFilter]);

  const handlePriorityChange = async (responsibility: Responsibility, newPriority: ResponsibilityPriority) => {
    if (!familyId || !userId) return;
    try {
      await updateResponsibilityPriority(familyId, responsibility.id, newPriority, userId);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const expandedResponsibility = expandedCardId ? responsibilityMap.get(expandedCardId) : undefined;

  return (
    <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', padding: '0 var(--space-20)' }}>
      <HomeHeader userFirstName={userFirstName} />

      <div style={{ paddingTop: '20px' }}>
        <CategoryFilterButtons
          categories={relevantCategories}
          activeCategory={activeFilter}
          onSelect={(category) => setActiveFilter(category)}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <p className="caption" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            {filteredResponsibilities.length} {filteredResponsibilities.length === 1 ? 'Verantwortung' : 'Verantwortungen'}
          </p>
          <SortToggle sortMode={sortMode} onChange={setSortMode} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <SkeletonCategoryCard key={index} />)
          ) : filteredResponsibilities.length === 0 ? (
            <div style={{ padding: '24px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="h2" style={{ margin: 0 }}>Du hast aktuell keine Verantwortungen</h2>
              <p className="body" style={{ margin: '12px 0 0 0', color: 'var(--color-text-secondary)' }}>
                Sobald dir etwas zugeordnet ist, erscheint es hier
              </p>
            </div>
          ) : (
            filteredResponsibilities.map((responsibility) => (
              <ResponsibilityCard
                key={responsibility.id}
                responsibility={responsibility}
                mode="start"
                onExpandDetails={() => setExpandedCardId(responsibility.id)}
                onPriorityChange={(newPriority) => handlePriorityChange(responsibility, newPriority)}
              />
            ))
          )}
        </div>
      </div>

      {/* Details Panel - read-only in Start mode */}
      {expandedResponsibility && (
        <ResponsibilityCardDetails
          responsibility={expandedResponsibility}
          mode="start"
          isExpanded={expandedCardId === expandedResponsibility.id}
          onClose={() => setExpandedCardId(null)}
        />
      )}
    </div>
  );
}
