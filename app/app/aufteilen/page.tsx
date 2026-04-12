'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { QuizCategory } from '@/types/quiz';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import {
  listenToAllResponsibilities,
  extractRelevantCategories,
  sortCategoriesByRelevance,
  sortResponsibilities,
  softDeleteResponsibility,
  updateResponsibilityAssignment,
  updateResponsibilityMeta,
  type Responsibility,
  type ResponsibilityOwner,
} from '@/services/responsibilities.service';
import { HomeHeader } from '@/components/home/HomeHeader';
import { CategoryFilterButtons } from '@/components/home/CategoryFilterButtons';
import { SortToggle } from '@/components/home/SortToggle';
import { ResponsibilityCard } from '@/components/home/ResponsibilityCard';
import { ResponsibilityCardDetails } from '@/components/home/ResponsibilityCardDetails';
import { DeleteConfirmationModal } from '@/components/home/DeleteConfirmationModal';
import { SkeletonCategoryCard } from '@/components/home/SkeletonCategoryCard';
import { categoryLabelMap } from '@/services/resultCalculator';

type SortMode = 'relevance' | 'area';

export default function Aufteilen() {
  const router = useRouter();
  const [userFirstName, setUserFirstName] = useState('');
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [activeFilter, setActiveFilter] = useState<QuizCategory | 'all' | null>('all');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [deleteConfirmationCardId, setDeleteConfirmationCardId] = useState<string | null>(null);

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
        // Use listenToAllResponsibilities to get all cards in family
        const unsub = listenToAllResponsibilities(
          bundle.profile.familyId,
          (cards) => {
            // Filter and map to Responsibility type
            const responsibilties = cards
              .filter((card) => !card.isDeleted && card.priority && card.assignedTo)
              .map((card) => ({
                ...card,
                priority: card.priority || 'observe',
                assignedTo: card.assignedTo || 'user',
              } as Responsibility));
            setResponsibilities(responsibilties);
            setIsLoading(false);
          },
          () => {
            setIsLoading(false);
          },
        );
        return unsub;
      }
    });
    return () => unsubscribe();
  }, [router]);

  const filteredResponsibilities = useMemo(() => {
    if (activeFilter === 'all' || !activeFilter) return responsibilities;
    return responsibilities.filter((item) => item.categoryKey === activeFilter);
  }, [responsibilities, activeFilter]);

  const relevantCategories = useMemo(
    () => sortCategoriesByRelevance(extractRelevantCategories(responsibilities), responsibilities),
    [responsibilities],
  );

  const sortedResponsibilities = useMemo(() => {
    if (sortMode === 'area') {
      return [...filteredResponsibilities].sort((a, b) => {
        const labelA = categoryLabelMap[a.categoryKey] || a.categoryKey;
        const labelB = categoryLabelMap[b.categoryKey] || b.categoryKey;
        if (labelA !== labelB) return labelA.localeCompare(labelB);
        const assignOrder = { user: 0, partner: 1, unassigned: 2 };
        const orderA = assignOrder[a.assignedTo] ?? 2;
        const orderB = assignOrder[b.assignedTo] ?? 2;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
      });
    }
    return sortResponsibilities(filteredResponsibilities);
  }, [filteredResponsibilities, sortMode]);

  const handleAssignmentChange = async (responsibility: Responsibility, newAssignee: ResponsibilityOwner) => {
    if (!familyId || !userId) return;
    try {
      await updateResponsibilityAssignment(familyId, responsibility.id, newAssignee, userId);
    } catch (error) {
      console.error('Failed to update assignment:', error);
    }
  };

  const handleDeleteCard = async (responsibility: Responsibility) => {
    if (!familyId || !userId) return;
    try {
      await softDeleteResponsibility(familyId, responsibility.id, userId);
      setExpandedCardId(null);
      setDeleteConfirmationCardId(null);
    } catch (error) {
      console.error('Failed to delete responsibility:', error);
    }
  };

  const handleSaveCard = async (responsibilityId: string, title: string, note: string) => {
    if (!familyId || !userId) return;
    try {
      await updateResponsibilityMeta(familyId, responsibilityId, { title, note }, userId);
    } catch (error) {
      console.error('Failed to save responsibility:', error);
    }
  };

  const expandedResponsibility = expandedCardId ? responsibilities.find((r) => r.id === expandedCardId) : undefined;

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
            {sortedResponsibilities.length} {sortedResponsibilities.length === 1 ? 'Verantwortung' : 'Verantwortungen'}
          </p>
          <SortToggle sortMode={sortMode} onChange={(mode) => setSortMode(mode)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <SkeletonCategoryCard key={index} />)
          ) : sortedResponsibilities.length === 0 ? (
            <div style={{ padding: '24px', borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
              <h2 className="h2" style={{ margin: 0 }}>Keine Verantwortungen</h2>
              <p className="body" style={{ margin: '12px 0 0 0', color: 'var(--color-text-secondary)' }}>
                Es gibt noch keine Verantwortungen zu verteilen
              </p>
            </div>
          ) : (
            sortedResponsibilities.map((responsibility) => (
              <ResponsibilityCard
                key={responsibility.id}
                responsibility={responsibility}
                mode="assign"
                onExpandDetails={() => setExpandedCardId(responsibility.id)}
                onAssignmentChange={(newAssignee) => handleAssignmentChange(responsibility, newAssignee)}
              />
            ))
          )}
        </div>
      </div>

      {/* Details Panel - editable in Assign mode */}
      {expandedResponsibility && (
        <ResponsibilityCardDetails
          responsibility={expandedResponsibility}
          mode="assign"
          isExpanded={expandedCardId === expandedResponsibility.id}
          onClose={() => setExpandedCardId(null)}
          onSave={(title, note) => handleSaveCard(expandedResponsibility.id, title, note)}
          onDelete={() => setDeleteConfirmationCardId(expandedResponsibility.id)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationCardId && (
        <DeleteConfirmationModal
          isOpen={Boolean(deleteConfirmationCardId)}
          title={responsibilities.find((r) => r.id === deleteConfirmationCardId)?.title}
          onConfirm={async () => {
            const card = responsibilities.find((r) => r.id === deleteConfirmationCardId);
            if (card) {
              await handleDeleteCard(card);
            }
          }}
          onCancel={() => setDeleteConfirmationCardId(null)}
        />
      )}
    </div>
  );
}
