import {
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
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import {
  computeNextTeamCheckAt,
  computeReminderAt,
  toScheduledKey,
} from '@/services/teamCheck.logic';
import { firestoreCollections } from '@/types/domain';
import type { AppUserProfile, FamilyDocument } from '@/types/partner-flow';
import type { TeamCheckActionType, TeamCheckPlan, TeamCheckPreparation, TeamCheckRecord } from '@/types/team-check';
import type { OwnershipCardDocument } from '@/types/ownership';

function nowIso() {
  return new Date().toISOString();
}

export async function saveTeamCheckPlan(params: {
  familyId: string;
  actorUserId: string;
  frequency: TeamCheckPlan['frequency'];
  dayOfWeek: number;
  time?: string | null;
}) {
  const nextDate = computeNextTeamCheckAt({
    frequency: params.frequency,
    dayOfWeek: params.dayOfWeek,
    time: params.time,
  });
  const nextCheckInAt = nextDate.toISOString();
  const reminderActiveAt = computeReminderAt(nextCheckInAt, params.time);

  const payload: TeamCheckPlan = {
    frequency: params.frequency,
    dayOfWeek: params.dayOfWeek,
    time: params.time?.trim() || null,
    nextCheckInAt,
    reminderActiveAt,
    updatedBy: params.actorUserId,
    createdAt: nowIso(),
  };

  await setDoc(doc(db, firestoreCollections.families, params.familyId), {
    teamCheckPlan: payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return payload;
}

export async function saveTeamCheckEmailPreference(params: {
  userId: string;
  enabled: boolean;
}) {
  await setDoc(doc(db, firestoreCollections.users, params.userId), {
    teamCheckEmailReminderEnabled: params.enabled,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function fetchTeamCheckEmailPreference(userId: string) {
  const profile = await getDoc(doc(db, firestoreCollections.users, userId));
  if (!profile.exists()) return true;
  const data = profile.data() as AppUserProfile & { teamCheckEmailReminderEnabled?: boolean };
  return data.teamCheckEmailReminderEnabled ?? true;
}

export async function saveTeamCheckPreparation(params: {
  familyId: string;
  userId: string;
  scheduledForKey: string;
  goodMoments: string;
  changeWishes?: string;
  handoverAreaCategoryKeys: TeamCheckPreparation['handoverAreaCategoryKeys'];
  swapAreaCategoryKeys: TeamCheckPreparation['swapAreaCategoryKeys'];
  selectedTaskActions: Array<{ cardId: string; action: TeamCheckActionType }>;
}) {
  const docId = `${params.scheduledForKey}_${params.userId}`;
  const payload: TeamCheckPreparation = {
    id: docId,
    familyId: params.familyId,
    userId: params.userId,
    scheduledForKey: params.scheduledForKey,
    goodMoments: params.goodMoments,
    changeWishes: params.changeWishes?.trim() || '',
    handoverAreaCategoryKeys: params.handoverAreaCategoryKeys,
    swapAreaCategoryKeys: params.swapAreaCategoryKeys,
    selectedTaskActions: params.selectedTaskActions,
    saved: true,
    updatedAt: nowIso(),
    createdAt: nowIso(),
  };

  await setDoc(doc(db, firestoreCollections.families, params.familyId, 'teamCheckPreparations', docId), payload, { merge: true });
}

export function observeTeamCheckPreparation(params: {
  familyId: string;
  scheduledForKey: string;
  userId: string;
  onData: (preparation: TeamCheckPreparation | null) => void;
}) {
  return onSnapshot(
    doc(db, firestoreCollections.families, params.familyId, 'teamCheckPreparations', `${params.scheduledForKey}_${params.userId}`),
    (snapshot) => {
      if (!snapshot.exists()) {
        params.onData(null);
        return;
      }
      params.onData(snapshot.data() as TeamCheckPreparation);
    },
  );
}

export function observePreparationPair(params: {
  familyId: string;
  scheduledForKey: string;
  onData: (preparations: TeamCheckPreparation[]) => void;
}) {
  return onSnapshot(
    query(
      collection(db, firestoreCollections.families, params.familyId, 'teamCheckPreparations'),
      where('scheduledForKey', '==', params.scheduledForKey),
    ),
    (snapshot) => {
      params.onData(snapshot.docs.map((entry) => entry.data() as TeamCheckPreparation));
    },
  );
}


export function observeTeamCheckRecords(params: {
  familyId: string;
  onData: (records: TeamCheckRecord[]) => void;
  maxEntries?: number;
}) {
  return onSnapshot(
    query(
      collection(db, firestoreCollections.families, params.familyId, 'teamCheckRecords'),
      orderBy('checkInAt', 'desc'),
      limit(params.maxEntries ?? 10),
    ),
    (snapshot) => {
      params.onData(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as TeamCheckRecord)));
    },
  );
}

export function observeLatestTeamCheckRecord(params: {
  familyId: string;
  onData: (record: TeamCheckRecord | null) => void;
}) {
  return onSnapshot(
    query(
      collection(db, firestoreCollections.families, params.familyId, 'teamCheckRecords'),
      orderBy('checkInAt', 'desc'),
      limit(1),
    ),
    (snapshot) => {
      if (snapshot.empty) {
        params.onData(null);
        return;
      }
      const first = snapshot.docs[0];
      params.onData({ id: first.id, ...first.data() } as TeamCheckRecord);
    },
  );
}

export async function saveTeamCheckRecord(params: {
  familyId: string;
  actorUserId: string;
  preparations: TeamCheckPreparation[];
  discussedCardIds: string[];
  discussedCategoryKeys: TeamCheckRecord['discussedCategoryKeys'];
  ownerDecisions: Array<{ cardId: string; toOwnerUserId: string | null }>;
  note?: string;
}) {
  const familyRef = doc(db, firestoreCollections.families, params.familyId);

  return runTransaction(db, async (transaction) => {
    const familySnap = await transaction.get(familyRef);
    if (!familySnap.exists()) throw new Error('Familie nicht gefunden.');
    const family = familySnap.data() as FamilyDocument;
    const plan = family.teamCheckPlan;
    if (!plan?.nextCheckInAt) throw new Error('Team-Check Planung fehlt.');

    const checkInAt = nowIso();
    const scheduledForKey = toScheduledKey(plan.nextCheckInAt);
    const recordId = `cycle_${scheduledForKey}`;
    const recordRef = doc(db, firestoreCollections.families, params.familyId, 'teamCheckRecords', recordId);
    const existingRecord = await transaction.get(recordRef);
    if (existingRecord.exists()) {
      return { alreadySaved: true, recordId };
    }

    const normalizedDecisions = params.ownerDecisions.reduce<Array<{ cardId: string; toOwnerUserId: string | null }>>((acc, decision) => {
      if (!decision.cardId) return acc;
      if (acc.some((entry) => entry.cardId === decision.cardId)) return acc;
      acc.push(decision);
      return acc;
    }, []);

    const snapshotBeforeCards: TeamCheckRecord['snapshotBeforeCards'] = [];
    const assignmentChanges: TeamCheckRecord['assignmentChanges'] = [];

    for (const decision of normalizedDecisions) {
      const cardRef = doc(db, firestoreCollections.families, params.familyId, 'ownershipCards', decision.cardId);
      const cardSnap = await transaction.get(cardRef);
      if (!cardSnap.exists()) continue;
      const card = { id: cardSnap.id, ...cardSnap.data() } as OwnershipCardDocument;
      const fromOwnerUserId = card.ownerUserId ?? null;
      const toOwnerUserId = decision.toOwnerUserId ?? null;

      snapshotBeforeCards.push({
        cardId: card.id,
        title: card.title,
        categoryKey: card.categoryKey,
        ownerUserId: fromOwnerUserId,
        focusLevel: card.focusLevel ?? null,
        isActive: card.isActive,
      });

      if (fromOwnerUserId === toOwnerUserId) continue;

      assignmentChanges.push({
        cardId: card.id,
        fromOwnerUserId,
        toOwnerUserId,
      });

      transaction.set(cardRef, {
        ownerUserId: toOwnerUserId,
        updatedBy: params.actorUserId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    const recordPayload: Omit<TeamCheckRecord, 'id'> = {
      familyId: params.familyId,
      scheduledForKey,
      checkInAt,
      preparationSnapshot: params.preparations,
      discussedCardIds: [...new Set(params.discussedCardIds)],
      discussedCategoryKeys: [...new Set(params.discussedCategoryKeys)],
      assignmentChanges,
      snapshotBeforeCards,
      note: params.note?.trim() || '',
      createdBy: params.actorUserId,
      createdAt: checkInAt,
    };

    const nextDate = computeNextTeamCheckAt({
      from: new Date(checkInAt),
      frequency: plan.frequency,
      dayOfWeek: plan.dayOfWeek,
      time: plan.time,
    });
    const nextCheckInAt = nextDate.toISOString();

    transaction.set(recordRef, recordPayload, { merge: false });
    transaction.set(familyRef, {
      teamCheckPlan: {
        ...plan,
        lastCheckInAt: checkInAt,
        nextCheckInAt,
        reminderActiveAt: computeReminderAt(nextCheckInAt, plan.time),
        updatedBy: params.actorUserId,
        updatedAt: checkInAt,
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { alreadySaved: false, recordId };
  });
}

export async function fetchDiscussionPreparationPair(params: {
  familyId: string;
  scheduledForKey: string;
}) {
  const snapshot = await getDocs(query(
    collection(db, firestoreCollections.families, params.familyId, 'teamCheckPreparations'),
    where('scheduledForKey', '==', params.scheduledForKey),
  ));
  return snapshot.docs.map((entry) => entry.data() as TeamCheckPreparation);
}

export function resolveScheduledForKey(nextCheckInAt?: string | null) {
  if (!nextCheckInAt) return null;
  return toScheduledKey(nextCheckInAt);
}
