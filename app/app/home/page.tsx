'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { QuizCategory } from '@/types/quiz';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import {
  listenToResponsibilitiesForUser,
  sortResponsibilities,
  extractRelevantCategories,
  sortCategoriesByRelevance,
  updateResponsibilityPriority,
  type Responsibility,
  type ResponsibilityPriority,
} from '@/services/responsibilities.service';
import { HomeHeader } from '@/components/home/HomeHeader';
import { DistributionCard } from '@/components/home/DistributionCard';
import { TopLoadCard } from '@/components/home/TopLoadCard';
import { PrimaryActionButton } from '@/components/home/PrimaryActionButton';
import { ResponsibilityCard } from '@/components/home/ResponsibilityCard';
import { CategoryFilterChips } from '@/components/home/CategoryFilterChips';
import { SkeletonCategoryCard } from '@/components/home/SkeletonCategoryCard';

export default function PersonalHomePage() {
  const router = useRouter();
  const [userFirstName, setUserFirstName] = useState('');
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>([]);
  const [activeFilter, setActiveFilter] = useState<QuizCategory | 'all' | null>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  // Load user data and setup listener
  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      console.debug('[HOME] User authenticated:', user.uid);
      setUserId(user.uid);

      const bundle = await fetchDashboardBundle(user.uid);
      console.debug('[HOME] Bundle loaded:', {
        familyId: bundle.profile?.familyId,
        displayName: bundle.profile?.displayName,
      });
      setUserFirstName(bundle.profile?.displayName?.split(' ')[0] || 'Nutzer');
      setFamilyId(bundle.profile?.familyId ?? null);

      if (bundle.profile?.familyId) {
        console.debug('[HOME] Setting up responsibilities listener for family:', bundle.profile.familyId);
        listenToResponsibilitiesForUser(
          bundle.profile.familyId,
          user.uid,
          (data) => {
            console.debug('[HOME] Responsibilities updated:', {
              count: data.length,
              responsibilities: data.map((r) => ({
                id: r.id,
                title: r.title,
                priority: r.priority,
                assignedTo: r.assignedTo,
                oldStructure: { ownerUserId: (r as any).ownerUserId, focusLevel: (r as any).focusLevel },
              })),
            });
            setResponsibilities(data);
            setIsLoading(false);
          },
          (error) => {
            console.error('[HOME] Failed to load responsibilities:', error);
            setIsLoading(false);
          },
        );
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Extract relevant categories
  const relevantCategories = useMemo(
    () => sortCategoriesByRelevance(extractRelevantCategories(responsibilities), responsibilities),
    [responsibilities],
  );

  // Sort responsibilities
  const sortedResponsibilities = useMemo(
    () => sortResponsibilities(responsibilities),
    [responsibilities],
  );

  // Filter by active category
  const filteredResponsibilities = useMemo(() => {
    if (activeFilter === 'all' || !activeFilter) {
      return sortedResponsibilities;
    }
    return sortedResponsibilities.filter((r) => r.categoryKey === activeFilter);
  }, [sortedResponsibilities, activeFilter]);

  // Statistics
  const actCount = useMemo(() => responsibilities.filter((r) => r.priority === 'act').length, [responsibilities]);

  const handlePrimaryAction = () => {
    router.push('/app/ownership-dashboard');
  };

  const handlePriorityChange = async (responsibility: Responsibility, newPriority: ResponsibilityPriority) => {
    if (!familyId || !userId) return;
    try {
      await updateResponsibilityPriority(familyId, responsibility.id, newPriority, userId);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', padding: '0 var(--space-20)' }}>
      <HomeHeader userFirstName={userFirstName} />

      <DistributionCard userPercent={60} partnerPercent={40} />

      <TopLoadCard category="Termine, Planung und Absprachen" />

      <PrimaryActionButton onPress={handlePrimaryAction} />

      {/* Verantwortungen List */}
      <div style={{ marginTop: 'var(--space-24)' }}>
        <h1 className="h1" style={{ margin: '0 0 var(--space-8) 0' }}>Verantwortungsgebiete</h1>

        {actCount > 0 && (
          <p className="caption" style={{ margin: '0 0 var(--space-16) 0', color: 'var(--color-text-secondary)' }}>
            {actCount} {actCount === 1 ? 'Thema' : 'Themen'} braucht deine Aufmerksamkeit
          </p>
        )}

        {/* Filter Chips */}
        <CategoryFilterChips
          categories={relevantCategories}
          activeCategory={activeFilter}
          onSelect={(category) => setActiveFilter(category)}
        />

        {/* Responsibilities List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <SkeletonCategoryCard key={index} />)
          ) : filteredResponsibilities.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-16)',
                borderRadius: 'var(--radius-card)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <p className="body" style={{ margin: 0 }}>
                {responsibilities.length === 0
                  ? 'Du hast aktuell keine Verantwortungen. Öffne den Tab "Aufteilen", um neue Bereiche hinzuzufügen.'
                  : 'Keine Verantwortungen in dieser Kategorie.'}
              </p>
            </div>
          ) : (
            filteredResponsibilities.map((responsibility) => (
              <ResponsibilityCard
                key={responsibility.id}
                responsibility={responsibility}
                onTap={() => {
                  // TODO: navigate to detail page
                }}
                onPriorityTap={(newPriority) => handlePriorityChange(responsibility, newPriority)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
