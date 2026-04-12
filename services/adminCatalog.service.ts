import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { CatalogResponsibilityCard } from '@/types/responsibility-cards';

const CATALOG_COLLECTION = 'catalog_responsibility_cards';

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
    orderBy('sortOrder', 'asc'),
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
