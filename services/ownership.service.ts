import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { firestoreCollections } from '@/types/domain';
import type { FamilyDocument } from '@/types/partner-flow';
import type { Locale } from '@/types/i18n';
import type { AgeGroup, QuizCategory } from '@/types/quiz';
import type {
  OwnershipCardDocument,
  OwnershipCategoryDocument,
  OwnershipComputationInput,
  OwnershipFocusLevel,
  OwnershipRecommendation,
  OwnershipSignalBreakdown,
  RecommendationReasonCode,
  TaskPackageTemplate,
} from '@/types/ownership';

const MAX_RECOMMENDATIONS = 2;

function nowIso() {
  return new Date().toISOString();
}

const focusOrder: Record<OwnershipFocusLevel, number> = {
  now: 0,
  soon: 1,
  later: 2,
};

function toReasonText(reasonCodes: RecommendationReasonCode[]) {
  if (reasonCodes.includes('high_test_load') && reasonCodes.includes('high_perceived_stress')) {
    return 'Empfohlen, weil dieser Bereich im Test stark belastet wirkt und zusätzlich als belastend empfunden wird.';
  }
  if (reasonCodes.includes('high_test_load') && reasonCodes.includes('different_perception')) {
    return 'Empfohlen, weil dieser Bereich im Alltag relevant erscheint und gleichzeitig unterschiedlich wahrgenommen wird.';
  }
  if (reasonCodes.includes('high_perceived_stress') && reasonCodes.includes('different_perception')) {
    return 'Empfohlen, weil dieser Bereich im Moment besonders relevant wirkt und unterschiedlich wahrgenommen wird.';
  }
  if (reasonCodes.includes('high_test_load')) {
    return 'Empfohlen, weil dieser Bereich im Test aktuell besonders relevant wirkt.';
  }
  if (reasonCodes.includes('high_perceived_stress')) {
    return 'Empfohlen, weil dieser Bereich aktuell als belastend empfunden wird.';
  }
  return 'Empfohlen, weil dieser Bereich aktuell als guter Startpunkt sichtbar ist.';
}

export function computeOwnershipSignals(input: OwnershipComputationInput): OwnershipSignalBreakdown[] {
  const categories = Object.keys(input.categoryScores) as QuizCategory[];

  return categories
    .map((categoryKey) => {
      const testLoadScore = input.categoryScores[categoryKey] ?? 0;
      const perceivedStressScore = input.stressCategories?.includes(categoryKey) ? 100 : 0;
      const partnerScore = input.partnerCategoryScores?.[categoryKey];
      const differenceScore = typeof partnerScore === 'number' ? Math.abs(testLoadScore - partnerScore) : 0;

      // Difference ist nur Verstärker und kann ohne primäre Relevanz nicht dominieren.
      const primaryScore = testLoadScore * 0.75 + perceivedStressScore * 0.25;
      const relevanceScore = Math.round(primaryScore * (1 + (differenceScore / 100) * 0.35));

      const reasonCodes: RecommendationReasonCode[] = [];
      if (testLoadScore >= 60) reasonCodes.push('high_test_load');
      if (perceivedStressScore >= 100) reasonCodes.push('high_perceived_stress');
      if (differenceScore >= 20 && primaryScore >= 35) reasonCodes.push('different_perception');

      return {
        categoryKey,
        testLoadScore,
        perceivedStressScore,
        differenceScore,
        relevanceScore,
        reasonCodes,
      } satisfies OwnershipSignalBreakdown;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function buildOwnershipRecommendations(input: OwnershipComputationInput): OwnershipRecommendation[] {
  const signals = computeOwnershipSignals(input);
  return signals.slice(0, MAX_RECOMMENDATIONS).map((entry) => ({
    categoryKey: entry.categoryKey,
    relevanceScore: entry.relevanceScore,
    reasonCodes: entry.reasonCodes,
    reasonText: toReasonText(entry.reasonCodes),
  }));
}

function mapTemplateLocale(value: Record<string, string> | undefined, locale: Locale, fallback = '') {
  return value?.[locale] || value?.de || fallback;
}

export async function fetchTaskPackageTemplates(ageGroup: AgeGroup) {
  const snapshot = await getDocs(query(
    collection(db, firestoreCollections.taskPackageTemplates),
    where('ageGroup', '==', ageGroup),
    where('isActive', '==', true),
  ));

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as TaskPackageTemplate)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveTaskPackageTemplate(template: TaskPackageTemplate, actorUserId: string) {
  await setDoc(doc(db, firestoreCollections.taskPackageTemplates, template.id), {
    ...template,
    updatedBy: actorUserId,
    updatedAt: serverTimestamp(),
    createdAt: template.createdAt ?? nowIso(),
  }, { merge: true });
}

export async function initializeFamilyOwnership(params: {
  familyId: string;
  ageGroup: AgeGroup;
  actorUserId: string;
  selectedCategories: QuizCategory[];
  recommendations: OwnershipRecommendation[];
  locale: Locale;
}) {
  const templates = await fetchTaskPackageTemplates(params.ageGroup);
  const recommendedByCategory = new Map(params.recommendations.map((item, index) => [item.categoryKey, { ...item, rank: index + 1 }]));
  const activeCategorySet = new Set(params.selectedCategories);

  await runTransaction(db, async (transaction) => {
    const familyRef = doc(db, firestoreCollections.families, params.familyId);
    const familySnap = await transaction.get(familyRef);
    if (!familySnap.exists()) throw new Error('Familie nicht gefunden.');

    const family = familySnap.data() as FamilyDocument;
    const defaultOwner = family.initiatorUserId;

    for (const categoryKey of activeCategorySet) {
      const recommendation = recommendedByCategory.get(categoryKey);
      const categoryRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCategories', categoryKey);
      transaction.set(categoryRef, {
        categoryKey,
        isRecommended: Boolean(recommendation),
        recommendationRank: recommendation?.rank ?? null,
        relevanceScore: recommendation?.relevanceScore ?? 0,
        reasonCodes: recommendation?.reasonCodes ?? [],
        activatedAt: nowIso(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const categoryTemplates = templates
        .filter((template) => template.categoryKey === categoryKey)
        .slice(0, 10);

      categoryTemplates.forEach((template, index) => {
        const cardRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCards', `${categoryKey}_${template.id}`);
        transaction.set(cardRef, {
          id: `${categoryKey}_${template.id}`,
          categoryKey,
          sourceTemplateId: template.id,
          title: mapTemplateLocale(template.title, params.locale, 'Ownership-Bereich'),
          note: mapTemplateLocale(template.note, params.locale, ''),
          ownerUserId: defaultOwner,
          focusLevel: index === 0 ? 'now' : 'soon',
          sortOrder: template.sortOrder,
          isDeleted: false,
          createdBy: params.actorUserId,
          updatedBy: params.actorUserId,
          createdAt: nowIso(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
    }
  });
}

export function observeOwnershipCategories(familyId: string, onData: (items: OwnershipCategoryDocument[]) => void) {
  return onSnapshot(collection(db, firestoreCollections.families, familyId, 'ownershipCategories'), (snapshot) => {
    const items = snapshot.docs.map((item) => item.data() as OwnershipCategoryDocument);
    onData(items.sort((a, b) => (a.recommendationRank ?? 99) - (b.recommendationRank ?? 99)));
  });
}

export function observeOwnershipCards(familyId: string, onData: (items: OwnershipCardDocument[]) => void) {
  const cardsQuery = query(
    collection(db, firestoreCollections.families, familyId, 'ownershipCards'),
    where('isDeleted', '==', false),
    orderBy('sortOrder', 'asc'),
  );

  return onSnapshot(cardsQuery, (snapshot) => {
    const items = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }) as OwnershipCardDocument)
      .sort((a, b) => {
        if (a.categoryKey !== b.categoryKey) return a.categoryKey.localeCompare(b.categoryKey);
        if (focusOrder[a.focusLevel] !== focusOrder[b.focusLevel]) return focusOrder[a.focusLevel] - focusOrder[b.focusLevel];
        return a.sortOrder - b.sortOrder;
      });

    onData(items);
  });
}

export async function upsertOwnershipCard(params: {
  familyId: string;
  cardId?: string;
  actorUserId: string;
  payload: Pick<OwnershipCardDocument, 'categoryKey' | 'title' | 'note' | 'ownerUserId' | 'focusLevel' | 'sortOrder'>;
}) {
  const cardId = params.cardId ?? doc(collection(db, firestoreCollections.families, params.familyId, 'ownershipCards')).id;
  const cardRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCards', cardId);
  const existing = await getDoc(cardRef);
  const before = existing.exists() ? existing.data() : null;

  const nextPayload = {
    id: cardId,
    ...params.payload,
    isDeleted: false,
    createdBy: (before as { createdBy?: string } | null)?.createdBy ?? params.actorUserId,
    updatedBy: params.actorUserId,
    createdAt: (before as { createdAt?: string } | null)?.createdAt ?? nowIso(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(cardRef, nextPayload, { merge: true });
  await addDoc(collection(db, firestoreCollections.families, params.familyId, 'auditEvents'), {
    entityType: 'ownershipCard',
    entityId: cardId,
    action: before ? 'updated' : 'created',
    actorUserId: params.actorUserId,
    before,
    after: nextPayload,
    createdAt: nowIso(),
  });
}

export async function softDeleteOwnershipCard(familyId: string, cardId: string, actorUserId: string) {
  const cardRef = doc(db, firestoreCollections.families, familyId, 'ownershipCards', cardId);
  const existing = await getDoc(cardRef);
  if (!existing.exists()) return;
  const before = existing.data();

  await setDoc(cardRef, {
    isDeleted: true,
    updatedBy: actorUserId,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await addDoc(collection(db, firestoreCollections.families, familyId, 'auditEvents'), {
    entityType: 'ownershipCard',
    entityId: cardId,
    action: 'deleted',
    actorUserId,
    before,
    after: {
      ...before,
      isDeleted: true,
    },
    createdAt: nowIso(),
  });
}
