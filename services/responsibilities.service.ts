import { onSnapshot, collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firestoreCollections } from '@/types/domain';
import type { OwnershipCardDocument, ResponsibilityPriority, ResponsibilityOwner } from '@/types/ownership';
import type { QuizCategory } from '@/types/quiz';

/**
 * SINGLE SOURCE OF TRUTH für Verantwortungen
 * 
 * Diese Service stellt sicher, dass Start und Aufteilen die gleichen Daten nutzen.
 * Alle Verantwortungen werden zentral verwaltet und Live-Updates werden propagiert.
 */

export type { ResponsibilityPriority, ResponsibilityOwner, OwnershipCardDocument };

export interface Responsibility extends OwnershipCardDocument {
  priority: ResponsibilityPriority;
  assignedTo: ResponsibilityOwner;
}

function isPermissionDeniedError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'permission-denied';
}

export function isResponsibility(card: OwnershipCardDocument): card is Responsibility {
  return Boolean(card.priority && card.assignedTo);
}

/**
 * Konvertiere alte Daten (ownerUserId, focusLevel) zu neuer Struktur (assignedTo, priority)
 */
function mapCardToResponsibility(card: OwnershipCardDocument, currentUserId: string): Responsibility | null {
  const priorityMapOldToNew: Record<string, ResponsibilityPriority> = {
    now: 'act',
    soon: 'plan',
    later: 'observe',
  };

  const assignedTo = card.assignedTo ?? (card.ownerUserId === currentUserId ? 'user' : card.ownerUserId ? 'partner' : null);
  if (!assignedTo) {
    console.debug('[mapCard] Skipping card with no owner/assignment:', {
      id: card.id,
      title: card.title,
      ownerUserId: card.ownerUserId,
      assignedTo: card.assignedTo,
      currentUserId,
    });
    return null;
  }

  const priority = card.priority ?? priorityMapOldToNew[card.focusLevel ?? 'later'] ?? 'observe';

  if (card.priority && card.assignedTo) {
    return card as Responsibility;
  }

  console.debug('[mapCard] Converted card to responsibility:', {
    id: card.id,
    title: card.title,
    ownerUserId: card.ownerUserId,
    assignedTo,
    priority,
    focusLevel: card.focusLevel,
  });

  return {
    ...card,
    assignedTo,
    priority,
  } as Responsibility;
}

/**
 * Live-Listener für Verantwortungen eines Nutzers
 * Gibt alle Verantwortungen zurück, die dem Nutzer zugeordnet sind
 * Konvertiert auch alte Datenstruktur in neue
 */
export function listenToResponsibilitiesForUser(
  familyId: string,
  userId: string,
  onUpdate: (responsibilities: Responsibility[]) => void,
  onError?: (error: Error) => void,
) {
  if (!familyId || !userId) {
    onError?.(new Error('familyId und userId erforderlich'));
    return () => {};
  }

  const q = query(
    collection(db, firestoreCollections.families, familyId, 'ownershipCards'),
    where('isDeleted', '==', false),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.debug('[listenToResponsibilitiesForUser] Snapshot received:', {
        totalDocs: snapshot.docs.length,
        familyId,
        userId,
      });

      const responsibilities = snapshot.docs
        .map((doc) => {
          const card = { ...(doc.data() as OwnershipCardDocument), id: doc.id };
          return mapCardToResponsibility(card, userId);
        })
        .filter((resp): resp is Responsibility => resp !== null)
        .filter((resp) => resp.assignedTo === 'user');

      console.debug('[listenToResponsibilitiesForUser] Final result:', {
        userId,
        count: responsibilities.length,
        responsibilities: responsibilities.map((r) => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          assignedTo: r.assignedTo,
        })),
      });

      onUpdate(responsibilities);
    },
    (error) => {
      if (isPermissionDeniedError(error)) {
        onUpdate([]);
        onError?.(error as Error);
        return;
      }
      console.error('Fehler beim Laden der Verantwortungen:', error);
      onError?.(error as Error);
    },
  );
}

/**
 * Live-Listener für alle Verantwortungen (für Aufteilen-Screen)
 */
export function listenToAllResponsibilities(
  familyId: string,
  onUpdate: (responsibilities: OwnershipCardDocument[]) => void,
  onError?: (error: Error) => void,
) {
  if (!familyId) {
    onError?.(new Error('familyId erforderlich'));
    return () => {};
  }

  const q = query(
    collection(db, firestoreCollections.families, familyId, 'ownershipCards'),
    where('isDeleted', '==', false),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const cards = snapshot.docs.map((doc) => ({ ...(doc.data() as OwnershipCardDocument), id: doc.id }));
      onUpdate(cards);
    },
    (error) => {
      if (isPermissionDeniedError(error)) {
        onUpdate([]);
        onError?.(error as Error);
        return;
      }
      console.error('Fehler beim Laden aller Verantwortungen:', error);
      onError?.(error as Error);
    },
  );
}

/**
 * Update Priorität einer Verantwortung
 */
export async function updateResponsibilityPriority(
  familyId: string,
  cardId: string,
  priority: ResponsibilityPriority,
  userId: string,
) {
  const cardRef = doc(db, firestoreCollections.families, familyId, 'ownershipCards', cardId);
  await updateDoc(cardRef, {
    priority,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update Zugehörigkeit (assignedTo)
 */
export async function updateResponsibilityAssignment(
  familyId: string,
  cardId: string,
  assignedTo: ResponsibilityOwner,
  userId: string,
) {
  const cardRef = doc(db, firestoreCollections.families, familyId, 'ownershipCards', cardId);
  await updateDoc(cardRef, {
    assignedTo,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Sortierung für Verantwortungen (act > plan > observe)
 */
const priorityOrder: Record<ResponsibilityPriority, number> = {
  act: 0,
  plan: 1,
  observe: 2,
};

export function sortResponsibilities(items: Responsibility[]): Responsibility[] {
  return [...items].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const timeA = new Date(a.updatedAt ?? 0).getTime();
    const timeB = new Date(b.updatedAt ?? 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Bereiche extrahieren, in denen mindestens eine Verantwortung existiert
 */
export function extractRelevantCategories(responsibilities: Responsibility[]): QuizCategory[] {
  const categories = new Set<QuizCategory>();
  responsibilities.forEach((resp) => {
    categories.add(resp.categoryKey);
  });
  return Array.from(categories);
}

/**
 * Sortiere Filter nach Relevanz
 */
export function sortCategoriesByRelevance(
  categories: QuizCategory[],
  responsibilities: Responsibility[],
): QuizCategory[] {
  const countByCategory = new Map<QuizCategory, number>();
  const maxPriorityByCategory = new Map<QuizCategory, number>();

  responsibilities.forEach((resp) => {
    countByCategory.set(resp.categoryKey, (countByCategory.get(resp.categoryKey) ?? 0) + 1);
    const currentPrio = maxPriorityByCategory.get(resp.categoryKey) ?? 999;
    const newPrio = priorityOrder[resp.priority];
    if (newPrio < currentPrio) {
      maxPriorityByCategory.set(resp.categoryKey, newPrio);
    }
  });

  return [...categories].sort((a, b) => {
    const prioA = maxPriorityByCategory.get(a) ?? 999;
    const prioB = maxPriorityByCategory.get(b) ?? 999;
    if (prioA !== prioB) return prioA - prioB;

    const countA = countByCategory.get(a) ?? 0;
    const countB = countByCategory.get(b) ?? 0;
    return countB - countA;
  });
}
