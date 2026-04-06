'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import type { QuizCategory } from '@/types/quiz';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import {
  listenToAllResponsibilities,
  getAllOwnershipCategories,
  mergeResponsibilitiesWithCatalogFallback,
  sortCategoriesByRelevance,
  sortResponsibilities,
  updateResponsibilityAssignment,
  type Responsibility,
  type ResponsibilityOwner,
  type OwnershipCardDocument,
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

// Extend Responsibility to track assignee names
interface ResponsibilityWithNames extends Responsibility {
  assigneeFullName?: string;
}

export default function Aufteilen() {
  const router = useRouter();
  const [userFirstName, setUserFirstName] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [activeFilter, setActiveFilter] = useState<QuizCategory | 'all' | null>('all');
  const [sortMode, setSortMode] = useState<SortMode>('relevance');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [deleteConfirmationCardId, setDeleteConfirmationCardId] = useState<string | null>(null);
  const [userPartnerData, setUserPartnerData] = useState<{ currentUserId: string; partnerId?: string } | null>(null);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.uid);

      const bundle = await fetchDashboardBundle(user.uid);
      setUserFullName(bundle.profile?.displayName || '');
      setUserFirstName(bundle.profile?.displayName?.split(' ')[0] || '');
      // TODO: Get partner name from family data or bundle
      setPartnerName('Partner');
      setFamilyId(bundle.profile?.familyId ?? null);
      setUserPartnerData({
        currentUserId: user.uid,
        partnerId: undefined, // TODO: Get from bundle or family data
      });

      if (bundle.profile?.familyId) {
        // Use listenToAllResponsibilities to get all cards in family
        const unsub = listenToAllResponsibilities(
          bundle.profile.familyId,
          (cards) => {
            const responsibilties = cards
              .filter((card) => !card.isDeleted)
              .map((card) => {
                const assignedTo = card.assignedTo ?? (card.ownerUserId === user.uid ? 'user' : card.ownerUserId ? 'partner' : 'user');
                const priority = card.priority ?? (card.focusLevel === 'now' ? 'act' : card.focusLevel === 'soon' ? 'plan' : 'observe');
                return {
                  ...card,
                  priority,
                  assignedTo,
                } as Responsibility;
              });

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
    () => sortCategoriesByRelevance(getAllOwnershipCategories(), responsibilities),
    [responsibilities],
  );

  const visibleResponsibilities = useMemo(() => {
    if (activeFilter === 'all' || !activeFilter) return filteredResponsibilities;
    return mergeResponsibilitiesWithCatalogFallback(activeFilter, filteredResponsibilities);
  }, [activeFilter, filteredResponsibilities]);

  const sortedResponsibilities = useMemo(() => {
    if (sortMode === 'area') {
      return [...visibleResponsibilities].sort((a, b) => {
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
    return sortResponsibilities(visibleResponsibilities);
  }, [visibleResponsibilities, sortMode]);

  const handleAssignmentChange = async (responsibility: Responsibility, newAssignee: ResponsibilityOwner) => {
    if (!familyId || !userId) return;
    try {
      await updateResponsibilityAssignment(familyId, responsibility.id, newAssignee, userId);
    } catch (error) {
      console.error('Failed to update assignment:', error);
    }
  };

  const handleDeleteCard = async (responsibility: Responsibility) => {
    // TODO: Implement actual deletion
    console.log('Delete responsibility:', responsibility.id);
    setDeleteConfirmationCardId(null);
  };

  const handleSaveCard = async (responsibilityId: string, title: string, note: string) => {
    // TODO: Implement save logic
    console.log('Save responsibility:', { responsibilityId, title, note });
  };

  const expandedResponsibility = expandedCardId ? visibleResponsibilities.find((r) => r.id === expandedCardId) : undefined;
  const isExpandedResponsibilityCatalog = expandedResponsibility?.assignedTo === 'unassigned';

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
          mode={isExpandedResponsibilityCatalog ? 'start' : 'assign'}
          isExpanded={expandedCardId === expandedResponsibility.id}
          onClose={() => setExpandedCardId(null)}
          onSave={isExpandedResponsibilityCatalog ? undefined : (title, note) => handleSaveCard(expandedResponsibility.id, title, note)}
          onDelete={isExpandedResponsibilityCatalog ? undefined : () => setDeleteConfirmationCardId(expandedResponsibility.id)}
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
