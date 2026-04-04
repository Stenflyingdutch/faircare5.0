import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { actionCategoryTaskCatalog } from '@/services/actionCategories';
import { fetchAppUserProfile } from '@/services/partnerFlow.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import { firestoreCollections } from '@/types/domain';
import type { ActionBoardDocument, BoardCardDocument, FamilyDocument, JointResultDocument } from '@/types/partner-flow';
import type { QuizCategory } from '@/types/quiz';

function nowIso() {
  return new Date().toISOString();
}

async function ensureFamilyAccess(userId: string, familyId: string) {
  const familyRef = doc(db, firestoreCollections.families, familyId);
  const familySnapshot = await getDoc(familyRef);
  if (!familySnapshot.exists()) {
    throw new Error('Familie nicht gefunden.');
  }

  const family = familySnapshot.data() as FamilyDocument;
  const isMember = family.initiatorUserId === userId || family.partnerUserId === userId;
  if (!isMember) {
    throw new Error('Kein Zugriff auf dieses Board.');
  }

  return family;
}

export async function initializeActionBoards(params: {
  userId: string;
  familyId: string;
  selectedCategories: QuizCategory[];
  suggestedCategories: QuizCategory[];
  actionCategoryReasons: Partial<Record<QuizCategory, string[]>>;
  actionCategoryPriority: Partial<Record<QuizCategory, 'high' | 'medium' | 'low'>>;
}) {
  const family = await ensureFamilyAccess(params.userId, params.familyId);

  const uniqueCategories = Array.from(new Set(params.selectedCategories));
  if (!uniqueCategories.length) {
    throw new Error('Bitte mindestens eine Kategorie wählen.');
  }

  const batch = writeBatch(db);
  const createdAt = nowIso();

  for (const category of uniqueCategories) {
    const boardId = `${params.familyId}_${category}`;
    const boardRef = doc(db, firestoreCollections.actionBoards, boardId);
    const boardSnapshot = await getDoc(boardRef);

    if (!boardSnapshot.exists()) {
      batch.set(boardRef, {
        id: boardId,
        pairId: params.familyId,
        categoryKey: category,
        categoryLabel: categoryLabelMap[category],
        createdAt,
        updatedAt: serverTimestamp(),
        catalogCollapsed: false,
      });

      const tasks = actionCategoryTaskCatalog[category] ?? [];
      tasks.forEach((taskTitle, index) => {
        const cardId = `${boardId}_card_${index + 1}`;
        const cardRef = doc(db, firestoreCollections.actionBoardCards, cardId);
        batch.set(cardRef, {
          id: cardId,
          pairId: params.familyId,
          categoryKey: category,
          baseTitle: taskTitle,
          customTitle: null,
          notes: null,
          ownerColumn: 'catalog',
          sortOrder: index,
          createdAt,
          updatedAt: serverTimestamp(),
        });
      });
    }
  }

  const jointSnap = await getDocs(query(
    collection(db, firestoreCollections.jointResults),
    where('familyId', '==', params.familyId),
  ));

  if (!jointSnap.empty) {
    const jointDoc = jointSnap.docs[0];
    batch.set(doc(db, firestoreCollections.jointResults, jointDoc.id), {
      selectedActionCategories: uniqueCategories,
      suggestedActionCategories: params.suggestedCategories,
      actionCategoryReasons: params.actionCategoryReasons,
      actionCategoryPriority: params.actionCategoryPriority,
      actionBoardsInitializedAt: createdAt,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  batch.set(doc(db, firestoreCollections.families, family.id), {
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await batch.commit();

  return {
    firstCategory: uniqueCategories[0],
  };
}

export function observeActionBoards(familyId: string, callback: (boards: ActionBoardDocument[]) => void) {
  return onSnapshot(
    query(
      collection(db, firestoreCollections.actionBoards),
      where('pairId', '==', familyId),
      orderBy('createdAt', 'asc'),
    ),
    (snapshot) => {
      const boards = snapshot.docs.map((entry) => entry.data() as ActionBoardDocument);
      callback(boards);
    },
  );
}

export function observeBoardCards(familyId: string, categoryKey: QuizCategory, callback: (cards: BoardCardDocument[]) => void) {
  return onSnapshot(
    query(
      collection(db, firestoreCollections.actionBoardCards),
      where('pairId', '==', familyId),
      where('categoryKey', '==', categoryKey),
      orderBy('sortOrder', 'asc'),
    ),
    (snapshot) => {
      const cards = snapshot.docs.map((entry) => entry.data() as BoardCardDocument);
      callback(cards);
    },
  );
}

export async function updateBoardCard(userId: string, cardId: string, payload: Partial<Pick<BoardCardDocument, 'customTitle' | 'notes'>>) {
  const cardRef = doc(db, firestoreCollections.actionBoardCards, cardId);
  const cardSnapshot = await getDoc(cardRef);
  if (!cardSnapshot.exists()) throw new Error('Karte nicht gefunden.');
  const card = cardSnapshot.data() as BoardCardDocument;

  await ensureFamilyAccess(userId, card.pairId);

  await setDoc(cardRef, {
    customTitle: payload.customTitle ?? null,
    notes: payload.notes ?? null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function moveBoardCard(userId: string, cardId: string, ownerColumn: BoardCardDocument['ownerColumn']) {
  const cardRef = doc(db, firestoreCollections.actionBoardCards, cardId);
  const cardSnapshot = await getDoc(cardRef);
  if (!cardSnapshot.exists()) throw new Error('Karte nicht gefunden.');
  const card = cardSnapshot.data() as BoardCardDocument;

  await ensureFamilyAccess(userId, card.pairId);

  await setDoc(cardRef, {
    ownerColumn,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function setCatalogCollapsed(userId: string, boardId: string, collapsed: boolean) {
  const boardRef = doc(db, firestoreCollections.actionBoards, boardId);
  const boardSnapshot = await getDoc(boardRef);
  if (!boardSnapshot.exists()) throw new Error('Board nicht gefunden.');
  const board = boardSnapshot.data() as ActionBoardDocument;

  await ensureFamilyAccess(userId, board.pairId);

  await setDoc(boardRef, {
    catalogCollapsed: collapsed,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function fetchActionBurdenCategoriesByFamily(familyId: string) {
  const familyRef = doc(db, firestoreCollections.families, familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) return { initiator: [] as QuizCategory[], partner: [] as QuizCategory[] };
  const family = familySnap.data() as FamilyDocument;

  const initiatorProfile = await fetchAppUserProfile(family.initiatorUserId);
  const partnerProfile = family.partnerUserId ? await fetchAppUserProfile(family.partnerUserId) : null;

  const initiatorBurden = await fetchStressCategories(initiatorProfile?.id ?? null);
  const partnerBurden = await fetchStressCategories(partnerProfile?.id ?? null);

  return {
    initiator: initiatorBurden,
    partner: partnerBurden,
  };
}

async function fetchStressCategories(userId: string | null) {
  if (!userId) return [] as QuizCategory[];

  const rawSnap = await getDocs(query(
    collection(db, firestoreCollections.userResults),
    where('userId', '==', userId),
  ));

  if (rawSnap.empty) return [] as QuizCategory[];

  const docData = rawSnap.docs[0].data() as { stressCategories?: QuizCategory[] };
  return (docData.stressCategories ?? []).slice(0, 3);
}
