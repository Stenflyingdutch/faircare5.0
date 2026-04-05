'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { OwnershipBoard } from '@/components/ownership/OwnershipBoard';
import { observeAuthState } from '@/services/auth.service';
import { ensureOwnershipCardsForCategories, observeOwnershipCards, observeOwnershipCategories } from '@/services/ownership.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import { getCurrentLocale } from '@/lib/i18n';
import type { AgeGroup, QuizCategory } from '@/types/quiz';
import type { OwnershipCardDocument, OwnershipCategoryDocument } from '@/types/ownership';

export default function OwnershipDashboardPage() {
  return (
    <Suspense fallback={<article className="card stack"><h2 className="card-title">Aufgabengebiete</h2><p className="card-description">Aufgabengebiete werden vorbereitet …</p></article>}>
      <OwnershipDashboardPageContent />
    </Suspense>
  );
}

function OwnershipDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [cards, setCards] = useState<OwnershipCardDocument[]>([]);
  const [categories, setCategories] = useState<OwnershipCategoryDocument[]>([]);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<Array<{ userId: string; label: string }>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const preselectedCategoryKeys = ((searchParams.get('categories') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is QuizCategory => Boolean(categoryLabelMap[entry as QuizCategory])));
  const isRecommendationEntry = searchParams.get('from') === 'recommendation' && preselectedCategoryKeys.length > 0;
  const allCategoryKeys = Object.keys(categoryLabelMap) as QuizCategory[];

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.uid);
      const bundle = await fetchDashboardBundle(user.uid);
      setFamilyId(bundle.profile?.familyId ?? null);
      setAgeGroup(bundle.ageGroupForOwnership ?? null);
      if (bundle.family) {
        const options = [
          { userId: bundle.family.initiatorUserId, label: bundle.initiatorDisplayName || 'Partner 1' },
          ...(bundle.family.partnerUserId ? [{ userId: bundle.family.partnerUserId, label: bundle.partnerDisplayName || 'Partner 2' }] : []),
        ];
        setOwnerOptions(options);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!familyId) return;
    const stopCards = observeOwnershipCards(familyId, setCards, () => setLoadError('Die Karten konnten gerade nicht geladen werden. Bitte versuche es erneut.'));
    const stopCategories = observeOwnershipCategories(familyId, setCategories, () => setLoadError('Die Kategorien konnten gerade nicht geladen werden. Bitte versuche es erneut.'));
    return () => {
      stopCards();
      stopCategories();
    };
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !userId || !ageGroup) return;
    const categoryKeys = categories.map((item) => item.categoryKey as QuizCategory);
    if (!categoryKeys.length || cards.length > 0) return;

    ensureOwnershipCardsForCategories({
      familyId,
      ageGroup,
      actorUserId: userId,
      locale: getCurrentLocale(),
      categoryKeys,
    }).catch(() => setLoadError('Die Karten konnten gerade nicht geladen oder angelegt werden. Bitte versuche es erneut.'));
  }, [familyId, userId, ageGroup, categories, cards.length]);

  if (!userId || !familyId) {
    return (
      <article className="card stack">
        <h2 className="card-title">Aufgabengebiete</h2>
        <p className="card-description">Aufgabengebiete werden vorbereitet …</p>
      </article>
    );
  }

  const recommendedCount = categories.filter((item) => item.isRecommended).length;

  return (
    <div className="stack">
      <article className="card stack">
        <h2 className="card-title">Aufgabengebiete</h2>
        <p className="card-description">
          Jede Karte steht für einen klar zugeordneten Verantwortungsbereich inklusive Planung und Durchführung.
        </p>
        <p className="helper" style={{ margin: 0 }}>
          {isRecommendationEntry
            ? 'Du startest direkt mit den ausgewählten Verantwortungsbereichen.'
            : recommendedCount > 0
              ? `${recommendedCount} Startkategorien wurden als Orientierung markiert.`
              : 'Alle aktiven Kategorien sind gleichwertig sichtbar.'}
        </p>
      </article>
      <OwnershipBoard
        familyId={familyId}
        currentUserId={userId}
        cards={cards}
        mode="dashboard"
        ownerOptions={ownerOptions}
        categoryKeys={allCategoryKeys}
        preselectedCategoryKeys={preselectedCategoryKeys}
        isFocusedEntry={isRecommendationEntry}
      />
      {loadError && <p className="inline-error">{loadError}</p>}
    </div>
  );
}
