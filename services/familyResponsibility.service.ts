import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { getCatalogCardById } from '@/services/catalog.service';
import type { FamilyResponsibilityCard } from '@/types/responsibility-cards';

const FAMILY_CARDS_SUBCOLLECTION = 'responsibility_cards';

function familyCardsCollection(familyId: string) {
  return collection(db, 'families', familyId, FAMILY_CARDS_SUBCOLLECTION);
}

function mapFamilyCard(id: string, payload: Record<string, unknown>): FamilyResponsibilityCard {
  return {
    id,
    familyId: String(payload.familyId ?? ''),
    categoryKey: String(payload.categoryKey ?? ''),
    title: String(payload.title ?? ''),
    description: String(payload.description ?? ''),
    sourceType: (payload.sourceType as FamilyResponsibilityCard['sourceType']) ?? 'custom',
    sourceCatalogCardId: typeof payload.sourceCatalogCardId === 'string' ? payload.sourceCatalogCardId : null,
    importedAt: (payload.importedAt as FamilyResponsibilityCard['importedAt']) ?? null,
    createdAt: payload.createdAt as FamilyResponsibilityCard['createdAt'],
    updatedAt: payload.updatedAt as FamilyResponsibilityCard['updatedAt'],
    createdBy: String(payload.createdBy ?? ''),
    updatedBy: String(payload.updatedBy ?? ''),
    assigneeUserId: typeof payload.assigneeUserId === 'string' ? payload.assigneeUserId : null,
    status: (payload.status as FamilyResponsibilityCard['status']) ?? 'open',
    focusState: (payload.focusState as FamilyResponsibilityCard['focusState']) ?? null,
    isArchived: Boolean(payload.isArchived),
    delegationState: typeof payload.delegationState === 'string' ? payload.delegationState : undefined,
    lastMessageAt: payload.lastMessageAt as FamilyResponsibilityCard['lastMessageAt'],
    messageCount: typeof payload.messageCount === 'number' ? payload.messageCount : undefined,
  };
}

export async function getFamilyCards(familyId: string, categoryKey: string) {
  const cardsQuery = query(
    familyCardsCollection(familyId),
    where('categoryKey', '==', categoryKey),
    where('isArchived', '==', false),
  );
  const snapshot = await getDocs(cardsQuery);
  return snapshot.docs.map((item) => mapFamilyCard(item.id, item.data() as Record<string, unknown>));
}


export function observeFamilyCards(
  familyId: string,
  onData: (cards: FamilyResponsibilityCard[]) => void,
  onError?: () => void,
) {
  const cardsQuery = query(
    familyCardsCollection(familyId),
    where('isArchived', '==', false),
  );

  return onSnapshot(
    cardsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((item) => mapFamilyCard(item.id, item.data() as Record<string, unknown>)));
    },
    () => onError?.(),
  );
}
export async function createCustomCard(
  familyId: string,
  categoryKey: string,
  title: string,
  description: string,
  userId: string,
) {
  const docRef = await addDoc(familyCardsCollection(familyId), {
    familyId,
    categoryKey,
    title: title.trim(),
    description: description.trim(),
    sourceType: 'custom',
    sourceCatalogCardId: null,
    importedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
    assigneeUserId: null,
    status: 'open',
    focusState: null,
    isArchived: false,
  } satisfies Omit<FamilyResponsibilityCard, 'id' | 'createdAt' | 'updatedAt' | 'importedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
    importedAt: null;
  });

  return docRef.id;
}

export async function importFromCatalog(familyId: string, catalogCardId: string, userId: string) {
  const catalogCard = await getCatalogCardById(catalogCardId);
  if (!catalogCard) {
    throw new Error('Katalog-Karte nicht gefunden.');
  }

  const duplicateQuery = query(
    familyCardsCollection(familyId),
    where('sourceCatalogCardId', '==', catalogCardId),
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);

  if (!duplicateSnapshot.empty) {
    throw new Error('Diese Katalog-Karte wurde bereits übernommen.');
  }

  const created = await addDoc(familyCardsCollection(familyId), {
    familyId,
    categoryKey: catalogCard.categoryKey,
    title: catalogCard.title,
    description: catalogCard.description,
    sourceType: 'catalog',
    sourceCatalogCardId: catalogCardId,
    importedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
    assigneeUserId: null,
    status: 'open',
    focusState: null,
    isArchived: false,
  });

  return created.id;
}
