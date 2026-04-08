'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { OwnershipBoard } from '@/components/ownership/OwnershipBoard';
import { observeAuthState } from '@/services/auth.service';
import {
  buildOwnershipRecommendations,
  computeOwnershipSignals,
  ensureOwnershipCardsForCategories,
  initializeFamilyOwnership,
  observeOwnershipCategories,
} from '@/services/ownership.service';
import { listenToAllResponsibilities } from '@/services/responsibilities.service';
import { ensureInitiatorFamilySetup, fetchDashboardBundle } from '@/services/partnerFlow.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import { getCurrentLocale } from '@/lib/i18n';
import type { AgeGroup, QuizCategory } from '@/types/quiz';
import type { OwnershipCardDocument } from '@/types/ownership';

export default function OwnershipDashboardPage() {
  return (
    <Suspense fallback={<article className="card stack"><h2 className="card-title">Verantwortungsgebiete</h2><p className="card-description">Verantwortungsgebiete werden vorbereitet …</p></article>}>
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
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<Array<{ userId: string; label: string }>>([]);
  const [autoPreselectedCategoryKeys, setAutoPreselectedCategoryKeys] = useState<QuizCategory[]>([]);
  const [recommendationPayload, setRecommendationPayload] = useState<{
    selectedCategories: QuizCategory[];
    recommendations: ReturnType<typeof buildOwnershipRecommendations>;
    signals: ReturnType<typeof computeOwnershipSignals>;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const queryCategoryKeys = ((searchParams.get('categories') ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is QuizCategory => Boolean(categoryLabelMap[entry as QuizCategory])));
  const preselectedCategoryKeys = queryCategoryKeys.length > 0 ? queryCategoryKeys : autoPreselectedCategoryKeys;
  const isRecommendationEntry = preselectedCategoryKeys.length > 0;
  const allCategoryKeys = useMemo(() => Object.keys(categoryLabelMap) as QuizCategory[], []);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.uid);
      let bundle = await fetchDashboardBundle(user.uid);
      if (bundle.profile?.role !== 'partner' && !bundle.profile?.familyId) {
        await ensureInitiatorFamilySetup(user.uid);
        bundle = await fetchDashboardBundle(user.uid);
      }
      const resolvedFamilyId = bundle.profile?.familyId ?? null;
      setFamilyId(resolvedFamilyId);
      setAgeGroup(bundle.ageGroupForOwnership ?? null);
      if (bundle.ownResult) {
        const signals = computeOwnershipSignals({
          categoryScores: bundle.ownResult.categoryScores,
          stressCategories: bundle.ownResult.stressCategories ?? [],
          partnerCategoryScores: bundle.partnerResult?.categoryScores,
        });
        const recommendations = buildOwnershipRecommendations({
          categoryScores: bundle.ownResult.categoryScores,
          stressCategories: bundle.ownResult.stressCategories ?? [],
          partnerCategoryScores: bundle.partnerResult?.categoryScores,
        });
        const selectedCategories = recommendations.map((entry) => entry.categoryKey);
        setAutoPreselectedCategoryKeys(selectedCategories);
        setRecommendationPayload(selectedCategories.length ? {
          selectedCategories,
          recommendations,
          signals,
        } : null);
      } else {
        setAutoPreselectedCategoryKeys([]);
        setRecommendationPayload(null);
      }

      console.info('[ownership-dashboard] membership debug', {
        userId: user.uid,
        profileFamilyId: bundle.profile?.familyId ?? null,
        familyExists: Boolean(bundle.family),
        familyInitiatorUserId: bundle.family?.initiatorUserId ?? null,
        familyPartnerUserId: bundle.family?.partnerUserId ?? null,
        isFamilyMember: Boolean(
          bundle.family
          && (bundle.family.initiatorUserId === user.uid || bundle.family.partnerUserId === user.uid)
        ),
      });

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
    const stopCards = listenToAllResponsibilities(familyId, setCards, () => setLoadError('Die Karten konnten gerade nicht geladen werden. Bitte versuche es erneut.'));
    const stopCategories = observeOwnershipCategories(familyId, () => undefined, () => setLoadError('Die Kategorien konnten gerade nicht geladen werden. Bitte versuche es erneut.'));
    return () => {
      stopCards();
      stopCategories();
    };
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !userId || !ageGroup) return;
    ensureOwnershipCardsForCategories({
      familyId,
      ageGroup,
      actorUserId: userId,
      locale: getCurrentLocale(),
      categoryKeys: allCategoryKeys,
    }).catch(() => setLoadError('Die Karten konnten gerade nicht geladen oder angelegt werden. Bitte versuche es erneut.'));
  }, [familyId, userId, ageGroup, allCategoryKeys]);

  useEffect(() => {
    if (!familyId || !userId || !ageGroup || !recommendationPayload?.selectedCategories.length) return;
    initializeFamilyOwnership({
      familyId,
      ageGroup,
      actorUserId: userId,
      selectedCategories: recommendationPayload.selectedCategories,
      recommendations: recommendationPayload.recommendations,
      allSignals: recommendationPayload.signals,
      locale: getCurrentLocale(),
    }).catch(() => setLoadError('Die empfohlenen Kategorien konnten gerade nicht vorbereitet werden. Bitte versuche es erneut.'));
  }, [familyId, userId, ageGroup, recommendationPayload]);

  if (!userId || !familyId) {
    return (
      <article className="card stack">
        <h2 className="card-title">Verantwortungsgebiete</h2>
        <p className="card-description">Verantwortungsgebiete werden vorbereitet …</p>
      </article>
    );
  }

  return (
    <div className="stack">
      <article className="card stack">
        <h2 className="card-title">Aufgabengebiete</h2>
        <p className="card-description">
          Jede Karte steht für einen klar zugeordneten Verantwortungsbereich inklusive Planung und Durchführung.
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
        ageGroup={ageGroup}
        isFocusedEntry={isRecommendationEntry}
      />
      {loadError && <p className="inline-error">{loadError}</p>}
    </div>
  );
}
