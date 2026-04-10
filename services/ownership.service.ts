import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { firestoreCollections } from '@/types/domain';
import { ownershipTaskPackageSeedByAgeGroup } from '@/data/ownershipTaskPackageTemplates';
import type { Locale, LocalizedText, LocalizedTextList } from '@/types/i18n';
import type { AgeGroup, ChildcareTag, QuizCategory } from '@/types/quiz';
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
const OWNERSHIP_CATALOG_VERSION = '2026-04-final-v2';

function nowIso() {
  return new Date().toISOString();
}

const focusOrder: Record<OwnershipFocusLevel, number> = {
  now: 0,
  soon: 1,
  later: 2,
};

function resolveFocusSort(value?: OwnershipFocusLevel | null) {
  if (!value) return 3;
  return focusOrder[value];
}

function toReasonText(reasonCodes: RecommendationReasonCode[]) {
  if (reasonCodes.includes('high_test_load') && reasonCodes.includes('high_perceived_stress')) {
    return 'Als Startpunkt empfohlen, weil dieser Bereich im Quiz aktuell stark sichtbar ist und im Alltag als belastend erlebt wird.';
  }
  if (reasonCodes.includes('high_test_load') && reasonCodes.includes('different_perception')) {
    return 'Als Startpunkt empfohlen, weil dieser Bereich aktuell sichtbar ist und unterschiedlich wahrgenommen wird.';
  }
  if (reasonCodes.includes('high_perceived_stress') && reasonCodes.includes('different_perception')) {
    return 'Als Startpunkt empfohlen, weil dieser Bereich im Moment besonders relevant wirkt und die Wahrnehmung auseinandergeht.';
  }
  if (reasonCodes.includes('high_test_load')) {
    return 'Als Startpunkt empfohlen, weil dieser Bereich im Quiz im Moment besonders relevant ist.';
  }
  if (reasonCodes.includes('high_perceived_stress')) {
    return 'Als Startpunkt empfohlen, weil dieser Bereich aktuell spürbar belastend ist.';
  }
  return 'Als Startpunkt empfohlen, weil dieser Bereich aktuell als relevant sichtbar wird.';
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

function mapTemplateDetailsLocale(value: LocalizedTextList | undefined, locale: Locale) {
  return value?.[locale] || value?.de || [];
}

function composeTemplateNote(details: string[]) {
  return details.join('\n');
}

function deriveDetailsFromLegacyNote(note: LocalizedText | undefined): LocalizedTextList {
  const splitLines = (value?: string) => (
    value
      ?.split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  );

  return {
    de: splitLines(note?.de),
    en: splitLines(note?.en),
    nl: splitLines(note?.nl),
  };
}

function normalizeTaskPackageTemplate(template: TaskPackageTemplate): TaskPackageTemplate {
  const details = template.details && Object.keys(template.details).length
    ? template.details
    : deriveDetailsFromLegacyNote(template.note);

  const nextNote: LocalizedText = {
    de: composeTemplateNote(details.de || deriveDetailsFromLegacyNote(template.note).de || []),
    en: composeTemplateNote(details.en || []),
    nl: composeTemplateNote(details.nl || []),
  };

  return {
    ...template,
    details,
    note: {
      de: nextNote.de || template.note?.de || '',
      en: nextNote.en || template.note?.en || '',
      nl: nextNote.nl || template.note?.nl || '',
    },
  };
}

function getOwnershipTaskPackageSeed(ageGroup: AgeGroup, categoryKey: QuizCategory) {
  return ownershipTaskPackageSeedByAgeGroup[ageGroup]?.[categoryKey] ?? [];
}

function mapChildcareToExternalFilterTags(childcareTags: ChildcareTag[] | string[] | undefined): string[] {
  if (!childcareTags?.length) return [];
  const mapped = childcareTags.flatMap((tag) => {
    if (tag === 'kita') return ['externalCare:kita'];
    if (tag === 'tagesmutter') return ['externalCare:tagespflege'];
    if (tag === 'family') return ['externalCare:familie'];
    if (tag === 'babysitter') return ['externalCare:babysitter'];
    return [];
  });
  return [...new Set(mapped)];
}

function matchesExternalCareFilter(templateTags: string[] | undefined, activeFilterTags: string[]) {
  if (!templateTags?.length) return true;
  if (!activeFilterTags.length) return false;
  return templateTags.some((tag) => activeFilterTags.includes(tag));
}

function buildSeedFallbackTemplates(ageGroup: AgeGroup, categoryKey: QuizCategory, locale: Locale, activeFilterTags: string[]) {
  return getOwnershipTaskPackageSeed(ageGroup, categoryKey)
    .filter((entry) => matchesExternalCareFilter(entry.filterTags, activeFilterTags))
    .map((entry, index) => {
    const details = mapTemplateDetailsLocale(entry.details, locale);
    return {
      id: `seed_${categoryKey}_${index + 1}`,
      categoryKey,
      title: mapTemplateLocale(entry.title, locale, 'Ownership-Bereich'),
      details,
      note: composeTemplateNote(details),
      filterTags: entry.filterTags ?? [],
      sortOrder: index + 1,
    };
    });
}

export async function fetchTaskPackageTemplates(ageGroup: AgeGroup) {
  const snapshot = await getDocs(query(
    collection(db, firestoreCollections.taskPackageTemplates),
    where('ageGroup', '==', ageGroup),
    where('isActive', '==', true),
  ));

  return snapshot.docs
    .map((item) => normalizeTaskPackageTemplate({ id: item.id, ...item.data() } as TaskPackageTemplate))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchTaskPackageTemplatesForAdmin(ageGroup: AgeGroup) {
  const snapshot = await getDocs(query(
    collection(db, firestoreCollections.taskPackageTemplates),
    where('ageGroup', '==', ageGroup),
    orderBy('categoryKey'),
    orderBy('sortOrder'),
  ));

  return snapshot.docs.map((item) => normalizeTaskPackageTemplate({ id: item.id, ...item.data() } as TaskPackageTemplate));
}

export async function saveTaskPackageTemplate(template: TaskPackageTemplate, actorUserId: string) {
  const normalized = normalizeTaskPackageTemplate(template);
  await setDoc(doc(db, firestoreCollections.taskPackageTemplates, template.id), {
    ...normalized,
    updatedBy: actorUserId,
    updatedAt: serverTimestamp(),
    createdAt: normalized.createdAt ?? nowIso(),
  }, { merge: true });
}

export async function seedTaskPackageTemplates(ageGroup: AgeGroup, actorUserId: string) {
  const categories = ownershipTaskPackageSeedByAgeGroup[ageGroup];
  if (!categories) return 0;

  const existingTemplates = await getDocs(query(
    collection(db, firestoreCollections.taskPackageTemplates),
    where('ageGroup', '==', ageGroup),
  ));

  if (!existingTemplates.empty) {
    const deleteBatch = writeBatch(db);
    existingTemplates.docs.forEach((entry) => deleteBatch.delete(entry.ref));
    await deleteBatch.commit();
  }

  const writes = Object.entries(categories).flatMap(([categoryKey, items]) =>
    items.map((entry, index) => {
      const id = `${ageGroup}_${categoryKey}_${index + 1}`;
      const payload: TaskPackageTemplate = {
        id,
        ageGroup,
        categoryKey: categoryKey as QuizCategory,
        title: entry.title,
        details: entry.details,
        note: {
          de: composeTemplateNote(entry.details.de || []),
          en: composeTemplateNote(entry.details.en || []),
          nl: composeTemplateNote(entry.details.nl || []),
        },
        filterTags: entry.filterTags ?? [],
        sortOrder: index + 1,
        isActive: true,
        version: 1,
      };
      return saveTaskPackageTemplate(payload, actorUserId);
    }),
  );

  await Promise.all(writes);
  return writes.length;
}

export async function initializeFamilyOwnership(params: {
  familyId: string;
  ageGroup: AgeGroup;
  actorUserId: string;
  selectedCategories: QuizCategory[];
  recommendations: OwnershipRecommendation[];
  allSignals: OwnershipSignalBreakdown[];
  locale: Locale;
}) {
  const templates = await fetchTaskPackageTemplates(params.ageGroup);
  const recommendedByCategory = new Map(params.recommendations.map((item, index) => [item.categoryKey, { ...item, rank: index + 1 }]));
  const signalByCategory = new Map(params.allSignals.map((item) => [item.categoryKey, item]));
  const activeCategoryList = [...new Set(params.selectedCategories)];
  const familyRef = doc(db, firestoreCollections.families, params.familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) throw new Error('Familie nicht gefunden.');

  const existingCardsSnap = activeCategoryList.length
    ? await getDocs(query(
      collection(db, firestoreCollections.families, params.familyId, 'ownershipCards'),
      where('categoryKey', 'in', activeCategoryList),
    ))
    : null;
  const existingCardIds = new Set(existingCardsSnap?.docs.map((entry) => entry.id) ?? []);

  const batch = writeBatch(db);

  for (const categoryKey of activeCategoryList) {
    const recommendation = recommendedByCategory.get(categoryKey);
    const signal = signalByCategory.get(categoryKey);
    const categoryRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCategories', categoryKey);
    batch.set(categoryRef, {
      categoryKey,
      isRecommended: Boolean(recommendation),
      recommendationRank: recommendation?.rank ?? null,
      relevanceScore: signal?.relevanceScore ?? recommendation?.relevanceScore ?? 0,
      reasonCodes: signal?.reasonCodes ?? recommendation?.reasonCodes ?? [],
      activatedAt: nowIso(),
      updatedAt: serverTimestamp(),
      initializedAt: nowIso(),
    }, { merge: true });

    const activeFilterTags = mapChildcareToExternalFilterTags((familySnap.data() as { ownershipExternalCareTags?: string[] | null })?.ownershipExternalCareTags ?? []);
    const categoryTemplates = templates
      .filter((template) => template.categoryKey === categoryKey)
      .filter((template) => matchesExternalCareFilter(template.filterTags, activeFilterTags));
    const fallbackTemplates = buildSeedFallbackTemplates(params.ageGroup, categoryKey, params.locale, activeFilterTags);
    const templatesForFamily = categoryTemplates.length > 0
      ? categoryTemplates.map((template) => ({
        id: template.id,
        categoryKey: template.categoryKey,
        title: mapTemplateLocale(template.title, params.locale, 'Ownership-Bereich'),
        details: mapTemplateDetailsLocale(template.details, params.locale),
        note: composeTemplateNote(mapTemplateDetailsLocale(template.details, params.locale)),
        filterTags: template.filterTags ?? [],
        sortOrder: template.sortOrder,
      }))
      : fallbackTemplates;

    for (const template of templatesForFamily) {
      const cardId = `${categoryKey}_${template.id}`;
      if (existingCardIds.has(cardId)) continue;
      const cardRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCards', cardId);

      batch.set(cardRef, {
        id: cardId,
        categoryKey,
        sourceTemplateId: categoryTemplates.length > 0 ? template.id : null,
        filterTags: template.filterTags ?? [],
        title: template.title,
        note: template.note,
        ownerUserId: null,
        focusLevel: null,
        sortOrder: template.sortOrder,
        isActive: false,
        isDeleted: false,
        createdBy: params.actorUserId,
        updatedBy: params.actorUserId,
        createdAt: nowIso(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }

  await batch.commit();
}

export async function setResultsDiscussedAtIfMissing(familyId: string, actorUserId: string) {
  const familyRef = doc(db, firestoreCollections.families, familyId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(familyRef);
    if (!snapshot.exists()) throw new Error('Familie nicht gefunden.');
    const family = snapshot.data() as { resultsDiscussedAt?: string | null };
    if (family.resultsDiscussedAt) return;
    transaction.set(familyRef, {
      resultsDiscussedAt: nowIso(),
      resultsDiscussedBy: actorUserId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function ensureOwnershipCardsForCategories(params: {
  familyId: string;
  ageGroup: AgeGroup;
  actorUserId: string;
  locale: Locale;
  categoryKeys: QuizCategory[];
}) {
  const templates = await fetchTaskPackageTemplates(params.ageGroup);
  const activeCategoryList = [...new Set(params.categoryKeys)];
  const familyRef = doc(db, firestoreCollections.families, params.familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) throw new Error('Familie nicht gefunden.');
  const existingCardsSnap = activeCategoryList.length
    ? await getDocs(query(
      collection(db, firestoreCollections.families, params.familyId, 'ownershipCards'),
      where('categoryKey', 'in', activeCategoryList),
    ))
    : null;
  const existingCardIds = new Set(existingCardsSnap?.docs.map((entry) => entry.id) ?? []);
  const activeFilterTags = mapChildcareToExternalFilterTags((familySnap.data() as { ownershipExternalCareTags?: string[] | null })?.ownershipExternalCareTags ?? []);

  const batch = writeBatch(db);
  let writes = 0;

  for (const categoryKey of activeCategoryList) {
    const categoryTemplates = templates
      .filter((template) => template.categoryKey === categoryKey)
      .filter((template) => matchesExternalCareFilter(template.filterTags, activeFilterTags));
    const fallbackTemplates = buildSeedFallbackTemplates(params.ageGroup, categoryKey, params.locale, activeFilterTags);
    const templatesForFamily = categoryTemplates.length > 0
      ? categoryTemplates.map((template) => ({
        id: template.id,
        categoryKey: template.categoryKey,
        title: mapTemplateLocale(template.title, params.locale, 'Ownership-Bereich'),
        details: mapTemplateDetailsLocale(template.details, params.locale),
        note: composeTemplateNote(mapTemplateDetailsLocale(template.details, params.locale)),
        filterTags: template.filterTags ?? [],
        sortOrder: template.sortOrder,
      }))
      : fallbackTemplates;

    for (const template of templatesForFamily) {
      const cardId = `${categoryKey}_${template.id}`;
      if (existingCardIds.has(cardId)) continue;
      const cardRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCards', cardId);

      batch.set(cardRef, {
        id: cardId,
        categoryKey,
        sourceTemplateId: categoryTemplates.length > 0 ? template.id : null,
        filterTags: template.filterTags ?? [],
        title: template.title,
        note: template.note,
        ownerUserId: null,
        focusLevel: null,
        sortOrder: template.sortOrder,
        isActive: false,
        isDeleted: false,
        createdBy: params.actorUserId,
        updatedBy: params.actorUserId,
        createdAt: nowIso(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      writes += 1;
    }
  }

  if (writes > 0) {
    await batch.commit();
  }
}

export async function hardResetFamilyOwnershipCatalog(params: {
  familyId: string;
  ageGroup: AgeGroup;
  actorUserId: string;
  locale: Locale;
  categoryKeys: QuizCategory[];
  childcareTags: ChildcareTag[];
}) {
  const familyRef = doc(db, firestoreCollections.families, params.familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) throw new Error('Familie nicht gefunden.');

  const activeFilterTags = mapChildcareToExternalFilterTags(params.childcareTags);
  const cardsSnap = await getDocs(collection(db, firestoreCollections.families, params.familyId, 'ownershipCards'));
  const categoriesSnap = await getDocs(collection(db, firestoreCollections.families, params.familyId, 'ownershipCategories'));
  const templates = await fetchTaskPackageTemplates(params.ageGroup);

  const deleteBatch = writeBatch(db);
  cardsSnap.docs.forEach((entry) => deleteBatch.delete(entry.ref));
  categoriesSnap.docs.forEach((entry) => deleteBatch.delete(entry.ref));
  await deleteBatch.commit();

  await setDoc(familyRef, {
    ownershipCatalogVersion: OWNERSHIP_CATALOG_VERSION,
    ownershipCatalogResetAt: nowIso(),
    ownershipCatalogResetBy: params.actorUserId,
    ownershipExternalCareTags: activeFilterTags,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  const createBatch = writeBatch(db);
  for (const categoryKey of params.categoryKeys) {
    const categoryRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCategories', categoryKey);
    createBatch.set(categoryRef, {
      categoryKey,
      isRecommended: false,
      recommendationRank: null,
      relevanceScore: 0,
      reasonCodes: [],
      activatedAt: nowIso(),
      updatedAt: serverTimestamp(),
      initializedAt: nowIso(),
    }, { merge: true });

    const categoryTemplates = templates
      .filter((template) => template.categoryKey === categoryKey)
      .filter((template) => matchesExternalCareFilter(template.filterTags, activeFilterTags));
    const fallbackTemplates = buildSeedFallbackTemplates(params.ageGroup, categoryKey, params.locale, activeFilterTags);
    const templatesForFamily = categoryTemplates.length > 0
      ? categoryTemplates.map((template) => ({
        id: template.id,
        categoryKey: template.categoryKey,
        title: mapTemplateLocale(template.title, params.locale, 'Ownership-Bereich'),
        details: mapTemplateDetailsLocale(template.details, params.locale),
        note: composeTemplateNote(mapTemplateDetailsLocale(template.details, params.locale)),
        filterTags: template.filterTags ?? [],
        sortOrder: template.sortOrder,
      }))
      : fallbackTemplates;

    for (const template of templatesForFamily) {
      const cardId = `${categoryKey}_${template.id}`;
      const cardRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCards', cardId);
      createBatch.set(cardRef, {
        id: cardId,
        categoryKey,
        sourceTemplateId: categoryTemplates.length > 0 ? template.id : null,
        filterTags: template.filterTags ?? [],
        title: template.title,
        note: template.note,
        ownerUserId: null,
        focusLevel: null,
        sortOrder: template.sortOrder,
        isActive: false,
        isDeleted: false,
        createdBy: params.actorUserId,
        updatedBy: params.actorUserId,
        createdAt: nowIso(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }

  await createBatch.commit();
}

export async function needsOwnershipCatalogReset(familyId: string) {
  const familySnap = await getDoc(doc(db, firestoreCollections.families, familyId));
  if (!familySnap.exists()) return true;
  const data = familySnap.data() as { ownershipCatalogVersion?: string };
  return data.ownershipCatalogVersion !== OWNERSHIP_CATALOG_VERSION;
}

export function observeOwnershipCategories(
  familyId: string,
  onData: (items: OwnershipCategoryDocument[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    collection(db, firestoreCollections.families, familyId, 'ownershipCategories'),
    (snapshot) => {
      const items = snapshot.docs.map((item) => item.data() as OwnershipCategoryDocument);
      onData(items.sort((a, b) => (a.recommendationRank ?? 99) - (b.recommendationRank ?? 99)));
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function observeOwnershipCards(
  familyId: string,
  onData: (items: OwnershipCardDocument[]) => void,
  onError?: (error: Error) => void,
) {
  const cardsQuery = query(
    collection(db, firestoreCollections.families, familyId, 'ownershipCards'),
    where('isDeleted', '==', false),
  );

  return onSnapshot(
    cardsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as OwnershipCardDocument)
        .sort((a, b) => {
          if (a.categoryKey !== b.categoryKey) return a.categoryKey.localeCompare(b.categoryKey);
          if (resolveFocusSort(a.focusLevel) !== resolveFocusSort(b.focusLevel)) return resolveFocusSort(a.focusLevel) - resolveFocusSort(b.focusLevel);
          return a.sortOrder - b.sortOrder;
        });

      onData(items);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function hasOwnershipCardsForFamily(familyId: string) {
  const cardsQuery = query(
    collection(db, firestoreCollections.families, familyId, 'ownershipCards'),
    where('isDeleted', '==', false),
    limit(1),
  );
  const snapshot = await getDocs(cardsQuery);
  return !snapshot.empty;
}

type OwnershipPatch = Record<string, unknown>;

export interface OwnershipCardOwnerPatch {
  ownerUserId: string | null;
}

export interface OwnershipCardFocusPatch {
  focusLevel: OwnershipFocusLevel | null;
}

export interface OwnershipCardContentPatch {
  title?: string;
  note?: string;
}

export interface OwnershipCardActivationPatch {
  isActive: boolean;
}

async function patchOwnershipCard(params: {
  familyId: string;
  cardId: string;
  actorUserId: string;
  patch: OwnershipPatch;
  action: string;
}) {
  const cardRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCards', params.cardId);
  const existing = await getDoc(cardRef);
  if (!existing.exists()) throw new Error('Karte nicht gefunden.');
  const before = existing.data();

  const updatePayload = {
    ...params.patch,
    updatedBy: params.actorUserId,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(cardRef, updatePayload);
  await addDoc(collection(db, firestoreCollections.families, params.familyId, 'auditEvents'), {
    entityType: 'ownershipCard',
    entityId: params.cardId,
    action: params.action,
    actorUserId: params.actorUserId,
    before,
    after: {
      ...before,
      ...params.patch,
    },
    createdAt: nowIso(),
  });
}

export async function createOwnershipCard(params: {
  familyId: string;
  actorUserId: string;
  payload: Pick<OwnershipCardDocument, 'categoryKey' | 'title' | 'note' | 'sortOrder'>;
}) {
  const cardId = doc(collection(db, firestoreCollections.families, params.familyId, 'ownershipCards')).id;
  const cardRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCards', cardId);
  const nextPayload = {
    id: cardId,
    ...params.payload,
    ownerUserId: null,
    focusLevel: null,
    isActive: false,
    isDeleted: false,
    createdBy: params.actorUserId,
    updatedBy: params.actorUserId,
    createdAt: nowIso(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(cardRef, nextPayload, { merge: false });
  await addDoc(collection(db, firestoreCollections.families, params.familyId, 'auditEvents'), {
    entityType: 'ownershipCard',
    entityId: cardId,
    action: 'created',
    actorUserId: params.actorUserId,
    before: null,
    after: nextPayload,
    createdAt: nowIso(),
  });
}

export async function updateOwnershipCardMeta(params: {
  familyId: string;
  cardId: string;
  actorUserId: string;
  patch: OwnershipCardContentPatch;
}) {
  return patchOwnershipCard({
    familyId: params.familyId,
    cardId: params.cardId,
    actorUserId: params.actorUserId,
    patch: {
      ...params.patch,
    },
    action: 'meta_updated',
  });
}

export async function updateOwnershipCardOwner(params: {
  familyId: string;
  cardId: string;
  actorUserId: string;
  patch: OwnershipCardOwnerPatch;
}) {
  return patchOwnershipCard({
    familyId: params.familyId,
    cardId: params.cardId,
    actorUserId: params.actorUserId,
    patch: {
      ownerUserId: params.patch.ownerUserId,
    },
    action: 'owner_updated',
  });
}

export async function updateOwnershipCardFocus(params: {
  familyId: string;
  cardId: string;
  actorUserId: string;
  patch: OwnershipCardFocusPatch;
}) {
  return patchOwnershipCard({
    familyId: params.familyId,
    cardId: params.cardId,
    actorUserId: params.actorUserId,
    patch: {
      focusLevel: params.patch.focusLevel,
    },
    action: 'focus_updated',
  });
}

export async function toggleOwnershipCardActive(params: {
  familyId: string;
  cardId: string;
  actorUserId: string;
  patch: OwnershipCardActivationPatch;
}) {
  return patchOwnershipCard({
    familyId: params.familyId,
    cardId: params.cardId,
    actorUserId: params.actorUserId,
    patch: {
      isActive: params.patch.isActive,
    },
    action: 'activation_updated',
  });
}

export async function softDeleteOwnershipCard(familyId: string, cardId: string, actorUserId: string) {
  const cardRef = doc(db, firestoreCollections.families, familyId, 'ownershipCards', cardId);
  const existing = await getDoc(cardRef);
  if (!existing.exists()) return;
  const before = existing.data();

  await setDoc(cardRef, {
    isActive: false,
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
      isActive: false,
      isDeleted: true,
    },
    createdAt: nowIso(),
  });
}
