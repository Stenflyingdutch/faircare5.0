import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { CatalogResponsibilityCard, ResponsibilityCatalogAgeGroup, ResponsibilityCatalogLanguage } from '@/types/responsibility-cards';

const CATALOG_COLLECTION = 'catalog_responsibility_cards';

function mapCatalogCard(id: string, payload: Record<string, unknown>): CatalogResponsibilityCard {
  return {
    id,
    categoryKey: String(payload.categoryKey ?? ''),
    title: String(payload.title ?? ''),
    description: String(payload.description ?? ''),
    language: (payload.language as ResponsibilityCatalogLanguage) ?? 'de',
    ageGroup: (payload.ageGroup as ResponsibilityCatalogAgeGroup) ?? '3-6',
    sortOrder: Number(payload.sortOrder ?? 0),
    isActive: Boolean(payload.isActive),
    createdBy: String(payload.createdBy ?? ''),
    updatedBy: String(payload.updatedBy ?? ''),
    createdAt: payload.createdAt as CatalogResponsibilityCard['createdAt'],
    updatedAt: payload.updatedAt as CatalogResponsibilityCard['updatedAt'],
    tags: Array.isArray(payload.tags) ? payload.tags.map((item) => String(item)) : undefined,
    version: typeof payload.version === 'number' ? payload.version : undefined,
  };
}

export interface AdminCatalogFilters {
  categoryKey?: string;
  language?: ResponsibilityCatalogLanguage;
  ageGroup?: ResponsibilityCatalogAgeGroup;
  isActive?: boolean;
}

export async function getCatalogCardsForAdmin(filters: AdminCatalogFilters = {}) {
  const constraints = [] as Array<ReturnType<typeof where>>;

  if (filters.categoryKey && filters.categoryKey !== 'all') {
    constraints.push(where('categoryKey', '==', filters.categoryKey));
  }
  if (filters.language) {
    constraints.push(where('language', '==', filters.language));
  }
  if (filters.ageGroup) {
    constraints.push(where('ageGroup', '==', filters.ageGroup));
  }
  if (typeof filters.isActive === 'boolean') {
    constraints.push(where('isActive', '==', filters.isActive));
  }

  try {
    const snapshot = await getDocs(query(collection(db, CATALOG_COLLECTION), ...constraints));
    const cards = snapshot.docs
      .map((item) => mapCatalogCard(item.id, item.data() as Record<string, unknown>))
      .sort((a, b) => {
        if (a.categoryKey !== b.categoryKey) return a.categoryKey.localeCompare(b.categoryKey);
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.title.localeCompare(b.title);
      });

    console.info('[admin-catalog] loaded cards', {
      collection: CATALOG_COLLECTION,
      filters,
      resultCount: cards.length,
    });

    return cards;
  } catch (error) {
    const firestoreError = error as { code?: string; message?: string };
    console.error('[admin-catalog] failed to load cards', {
      collection: CATALOG_COLLECTION,
      filters,
      resultCount: 0,
      errorCode: firestoreError?.code ?? 'unknown',
      errorMessage: firestoreError?.message ?? 'unknown error',
    });
    throw error;
  }
}

export async function createCatalogCard(
  payload: Omit<CatalogResponsibilityCard, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
) {
  const created = await addDoc(collection(db, CATALOG_COLLECTION), {
    ...payload,
    createdBy: userId,
    updatedBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return created.id;
}

export async function updateCatalogCard(
  catalogCardId: string,
  patch: Partial<Omit<CatalogResponsibilityCard, 'id' | 'createdAt' | 'createdBy'>>,
  userId: string,
) {
  await updateDoc(doc(db, CATALOG_COLLECTION, catalogCardId), {
    ...patch,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCatalogCard(catalogCardId: string) {
  await deleteDoc(doc(db, CATALOG_COLLECTION, catalogCardId));
}

export async function reorderCatalogCards(categoryKey: string, language: CatalogResponsibilityCard['language'], orderedCardIds: string[], userId: string) {
  const snapshot = await getDocs(query(
    collection(db, CATALOG_COLLECTION),
    where('categoryKey', '==', categoryKey),
    where('language', '==', language),
  ));

  const existingIds = new Set(snapshot.docs.map((item) => item.id));
  const normalized = orderedCardIds.filter((id) => existingIds.has(id));

  const batch = writeBatch(db);
  normalized.forEach((cardId, index) => {
    batch.update(doc(db, CATALOG_COLLECTION, cardId), {
      sortOrder: index + 1,
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
