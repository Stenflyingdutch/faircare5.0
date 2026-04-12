import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { CatalogResponsibilityCard, ResponsibilityCatalogLanguage } from '@/types/responsibility-cards';

const CATALOG_COLLECTION = 'catalog_responsibility_cards';

function mapCatalogCard(id: string, payload: Record<string, unknown>): CatalogResponsibilityCard {
  return {
    id,
    categoryKey: String(payload.categoryKey ?? ''),
    title: String(payload.title ?? ''),
    description: String(payload.description ?? ''),
    language: (payload.language as ResponsibilityCatalogLanguage) ?? 'de',
    ageGroup: (payload.ageGroup as CatalogResponsibilityCard['ageGroup']) ?? '3-6',
    sortOrder: Number(payload.sortOrder ?? 0),
    isActive: Boolean(payload.isActive),
    createdAt: payload.createdAt as CatalogResponsibilityCard['createdAt'],
    updatedAt: payload.updatedAt as CatalogResponsibilityCard['updatedAt'],
    createdBy: String(payload.createdBy ?? ''),
    updatedBy: String(payload.updatedBy ?? ''),
    tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => String(tag)) : undefined,
    version: typeof payload.version === 'number' ? payload.version : undefined,
  };
}

export async function getCatalogCards(categoryKey: string, language: ResponsibilityCatalogLanguage) {
  const cardsQuery = query(
    collection(db, CATALOG_COLLECTION),
    where('categoryKey', '==', categoryKey),
    where('language', '==', language),
    where('isActive', '==', true),
    orderBy('sortOrder', 'asc'),
  );

  const snapshot = await getDocs(cardsQuery);
  return snapshot.docs.map((item) => mapCatalogCard(item.id, item.data() as Record<string, unknown>));
}

export async function getCatalogCardById(id: string) {
  const snapshot = await getDoc(doc(db, CATALOG_COLLECTION, id));
  if (!snapshot.exists()) return null;
  return mapCatalogCard(snapshot.id, snapshot.data() as Record<string, unknown>);
}
