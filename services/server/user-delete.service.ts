import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type {
  DocumentData,
  DocumentReference,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { buildDisplayName, normalizeEmailAddress, resolveAdminRole } from '@/services/user-profile.service';
import { firestoreCollections } from '@/types/domain';
import type { AppUserProfile, FamilyDocument } from '@/types/partner-flow';

type DeleteMode = 'self' | 'admin';

type DeleteRequest = {
  targetUserId: string;
  actorUserId: string;
  actorIsAdmin: boolean;
  mode: DeleteMode;
};

type DeleteOutcome = {
  success: true;
  targetUserId: string;
  alreadyDeleted: boolean;
  authDeleted: boolean;
  deletedDocuments: number;
  updatedDocuments: number;
};

type DeletionReferences = {
  profile: AppUserProfile | null;
  authUserExists: boolean;
  targetEmail: string | null;
  userResultById: DocumentReference<DocumentData>;
  userResultsByUserId: QueryDocumentSnapshot<DocumentData>[];
  quizResultsByUserId: QueryDocumentSnapshot<DocumentData>[];
  quizSessionsByUserId: QueryDocumentSnapshot<DocumentData>[];
  resultsByUserId: QueryDocumentSnapshot<DocumentData>[];
  mailLogsByUserId: QueryDocumentSnapshot<DocumentData>[];
  invitationsByInitiator: QueryDocumentSnapshot<DocumentData>[];
  invitationsByPartnerEmail: QueryDocumentSnapshot<DocumentData>[];
  familySnapshots: QueryDocumentSnapshot<DocumentData>[];
  derivedSessionIds: Set<string>;
};

type CleanupCounters = {
  deletedDocuments: number;
  updatedDocuments: number;
};

const LEGACY_PERSONAL_COLLECTIONS = [
  'actionBoards',
  'actionBoardCards',
  'publicTestResponses',
  'personal_area',
  firestoreCollections.couples,
  firestoreCollections.taskAssignments,
  firestoreCollections.weeklyCheckins,
] as const;

const OWNED_REFERENCE_FIELDS = [
  'userId',
  'uid',
  'ownerUserId',
  'createdBy',
  'updatedBy',
  'actorUserId',
] as const;

const RELATION_REFERENCE_FIELDS = [
  'initiatorUid',
  'partnerUid',
  'initiatorUserId',
  'partnerUserId',
] as const;

const RELATION_ARRAY_FIELDS = [
  'memberIds',
  'ownerIds',
  'participants',
  'participantIds',
  'userIds',
] as const;

function nowIso() {
  return new Date().toISOString();
}

function logDelete(event: string, payload: Record<string, unknown>) {
  console.info(event, payload);
}

function logDeleteError(payload: Record<string, unknown>) {
  console.error('user.delete.failed', payload);
}

function chunk<T>(items: T[], size = 400) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function dedupeDocsByPath<T extends { ref: DocumentReference<DocumentData> }>(docs: T[]) {
  const map = new Map<string, T>();
  docs.forEach((entry) => map.set(entry.ref.path, entry));
  return [...map.values()];
}

async function deleteDocRefs(refs: DocumentReference<DocumentData>[]) {
  const uniqueRefs = dedupeDocsByPath(refs.map((ref) => ({ ref }))).map((entry) => entry.ref);
  if (uniqueRefs.length === 0) return 0;

  let deleted = 0;
  for (const part of chunk(uniqueRefs)) {
    const batch = adminDb.batch();
    part.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += part.length;
  }
  return deleted;
}

async function deleteQueryDocs(docs: QueryDocumentSnapshot<DocumentData>[]) {
  return deleteDocRefs(docs.map((entry) => entry.ref));
}

async function queryDocsByField(
  collectionName: string,
  field: string,
  value: string,
) {
  const snapshot = await adminDb.collection(collectionName).where(field, '==', value).get();
  return snapshot.docs;
}

async function queryDocsByArrayContains(
  collectionName: string,
  field: string,
  value: string,
) {
  const snapshot = await adminDb.collection(collectionName).where(field, 'array-contains', value).get();
  return snapshot.docs;
}

async function countAdmins() {
  const snapshot = await adminDb.collection(firestoreCollections.users).where('adminRole', '==', 'admin').get();
  return snapshot.size;
}

async function ensureNotLastAdmin(profile: AppUserProfile | null) {
  if (resolveAdminRole(profile) !== 'admin') return;

  const adminCount = await countAdmins();
  if (adminCount <= 1) {
    throw new UserDeleteError('Der letzte Admin kann nicht gelöscht werden.', 409, 'user_delete/last_admin');
  }
}

function deriveProfileDisplayName(profile?: AppUserProfile | null) {
  if (!profile) return null;
  const fromNames = buildDisplayName(profile.firstName, profile.lastName);
  return fromNames || profile.displayName || profile.email || null;
}

function deriveFamilyMembership(
  family: FamilyDocument,
  targetUserId: string,
) {
  const isInitiator = family.initiatorUserId === targetUserId;
  const isPartner = family.partnerUserId === targetUserId;

  if (!isInitiator && !isPartner) {
    return {
      includesTarget: false,
      remainingUserId: null as string | null,
      deletedRole: null as 'initiator' | 'partner' | null,
    };
  }

  if (isInitiator) {
    const remaining = family.partnerUserId && family.partnerUserId !== targetUserId
      ? family.partnerUserId
      : null;
    return {
      includesTarget: true,
      remainingUserId: remaining,
      deletedRole: 'initiator' as const,
    };
  }

  const remaining = family.initiatorUserId && family.initiatorUserId !== targetUserId
    ? family.initiatorUserId
    : null;
  return {
    includesTarget: true,
    remainingUserId: remaining,
    deletedRole: 'partner' as const,
  };
}

async function updateDocsFieldToNull(
  collectionName: string,
  field: string,
  value: string,
) {
  const docs = await queryDocsByField(collectionName, field, value);
  if (docs.length === 0) return 0;

  let updated = 0;
  for (const part of chunk(docs)) {
    const batch = adminDb.batch();
    part.forEach((entry) => {
      batch.set(entry.ref, {
        [field]: null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
    updated += part.length;
  }
  return updated;
}

async function removeUidFromArrayField(
  collectionName: string,
  field: string,
  userId: string,
) {
  const docs = await queryDocsByArrayContains(collectionName, field, userId);
  if (docs.length === 0) return 0;

  let updated = 0;
  for (const part of chunk(docs)) {
    const batch = adminDb.batch();
    part.forEach((entry) => {
      batch.set(entry.ref, {
        [field]: FieldValue.arrayRemove(userId),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
    updated += part.length;
  }
  return updated;
}

async function deleteCollectionByField(
  collectionName: string,
  field: string,
  value: string,
) {
  const docs = await queryDocsByField(collectionName, field, value);
  return deleteQueryDocs(docs);
}

async function deleteCollectionByFamilyId(
  collectionName: string,
  familyId: string,
) {
  return deleteCollectionByField(collectionName, 'familyId', familyId);
}

async function deleteSubcollection(
  familyId: string,
  subcollectionName: string,
) {
  const snapshot = await adminDb
    .collection(firestoreCollections.families)
    .doc(familyId)
    .collection(subcollectionName)
    .get();
  return deleteQueryDocs(snapshot.docs);
}

async function updateOwnershipCardsForDeletedUser(params: {
  familyId: string;
  deletedUserId: string;
  actorUserId: string;
}) {
  const cardsRef = adminDb.collection(firestoreCollections.families).doc(params.familyId).collection('ownershipCards');
  const [ownedCards, createdCards, updatedCards] = await Promise.all([
    cardsRef.where('ownerUserId', '==', params.deletedUserId).get(),
    cardsRef.where('createdBy', '==', params.deletedUserId).get(),
    cardsRef.where('updatedBy', '==', params.deletedUserId).get(),
  ]);

  const touched = dedupeDocsByPath([
    ...ownedCards.docs,
    ...createdCards.docs,
    ...updatedCards.docs,
  ]);
  if (touched.length === 0) return 0;

  let updated = 0;
  for (const part of chunk(touched)) {
    const batch = adminDb.batch();
    part.forEach((entry) => {
      const payload: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (entry.get('ownerUserId') === params.deletedUserId) payload.ownerUserId = null;
      if (entry.get('createdBy') === params.deletedUserId) payload.createdBy = params.actorUserId;
      if (entry.get('updatedBy') === params.deletedUserId) payload.updatedBy = params.actorUserId;
      batch.set(entry.ref, payload, { merge: true });
    });
    await batch.commit();
    updated += part.length;
  }

  return updated;
}

async function promoteRemainingUserToInitiator(params: {
  familyId: string;
  remainingUserId: string;
  deletedUserId: string;
}) {
  const familyRef = adminDb.collection(firestoreCollections.families).doc(params.familyId);
  const remainingUserRef = adminDb.collection(firestoreCollections.users).doc(params.remainingUserId);
  const [remainingSnapshot, familySnapshot] = await Promise.all([remainingUserRef.get(), familyRef.get()]);

  const remainingProfile = remainingSnapshot.exists ? remainingSnapshot.data() as AppUserProfile : null;
  const family = familySnapshot.exists ? familySnapshot.data() as FamilyDocument : null;
  const remainingName = deriveProfileDisplayName(remainingProfile)
    || (family?.partnerUserId === params.remainingUserId ? family?.partnerDisplayName ?? null : null)
    || (family?.initiatorUserId === params.remainingUserId ? family?.initiatorDisplayName ?? null : null)
    || 'Nutzer';

  const nextTeamCheckPlan = family?.teamCheckPlan
    ? {
      ...family.teamCheckPlan,
      updatedBy: family.teamCheckPlan.updatedBy === params.deletedUserId
        ? params.remainingUserId
        : family.teamCheckPlan.updatedBy,
      updatedAt: nowIso(),
    }
    : null;

  await Promise.all([
    remainingUserRef.set({
      familyId: params.familyId,
      role: 'initiator',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    familyRef.set({
      initiatorUserId: params.remainingUserId,
      initiatorDisplayName: remainingName,
      partnerUserId: null,
      partnerDisplayName: null,
      status: 'invited',
      initiatorRegistered: true,
      initiatorCompleted: true,
      partnerRegistered: false,
      partnerCompleted: false,
      resultsUnlocked: false,
      sharedResultsOpened: false,
      unlockedAt: null,
      unlockedBy: null,
      sharedResultsOpenedAt: null,
      sharedResultsOpenedBy: null,
      resultsDiscussedAt: null,
      resultsDiscussedBy: null,
      invitationId: null,
      teamCheckPlan: nextTeamCheckPlan,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
  ]);

  const remainingResultDocs = await adminDb.collection(firestoreCollections.quizResults)
    .where('familyId', '==', params.familyId)
    .where('userId', '==', params.remainingUserId)
    .get();

  let updatedResults = 0;
  for (const part of chunk(remainingResultDocs.docs)) {
    const batch = adminDb.batch();
    part.forEach((entry) => {
      batch.set(entry.ref, {
        role: 'initiator',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
    updatedResults += part.length;
  }

  return updatedResults + 2;
}

async function collectDeletionReferences(targetUserId: string): Promise<DeletionReferences> {
  const userRef = adminDb.collection(firestoreCollections.users).doc(targetUserId);
  const userResultById = adminDb.collection(firestoreCollections.userResults).doc(targetUserId);

  const [profileSnapshot, authUser] = await Promise.all([
    userRef.get(),
    adminAuth.getUser(targetUserId).catch((error: { code?: string }) => {
      if (error?.code === 'auth/user-not-found') return null;
      throw error;
    }),
  ]);

  const profile = profileSnapshot.exists ? profileSnapshot.data() as AppUserProfile : null;
  const targetEmail = normalizeEmailAddress(profile?.email || authUser?.email || '') || null;

  const [userResultsByUserId, quizResultsByUserId, quizSessionsByUserId, resultsByUserId, mailLogsByUserId, invitationsByInitiator] = await Promise.all([
    queryDocsByField(firestoreCollections.userResults, 'userId', targetUserId),
    queryDocsByField(firestoreCollections.quizResults, 'userId', targetUserId),
    queryDocsByField(firestoreCollections.quizSessions, 'userId', targetUserId),
    queryDocsByField(firestoreCollections.results, 'userId', targetUserId),
    queryDocsByField(firestoreCollections.mailLogs, 'userId', targetUserId),
    queryDocsByField(firestoreCollections.invitations, 'initiatorUserId', targetUserId),
  ]);

  const invitationsByPartnerEmail = targetEmail
    ? await queryDocsByField(firestoreCollections.invitations, 'partnerEmail', targetEmail)
    : [];

  const [familyAsInitiator, familyAsPartner] = await Promise.all([
    queryDocsByField(firestoreCollections.families, 'initiatorUserId', targetUserId),
    queryDocsByField(firestoreCollections.families, 'partnerUserId', targetUserId),
  ]);
  const familyMap = new Map<string, QueryDocumentSnapshot<DocumentData>>();
  [...familyAsInitiator, ...familyAsPartner].forEach((entry) => familyMap.set(entry.id, entry));

  if (profile?.familyId && !familyMap.has(profile.familyId)) {
    const fallbackFamily = await adminDb.collection(firestoreCollections.families).doc(profile.familyId).get();
    if (fallbackFamily.exists) {
      familyMap.set(fallbackFamily.id, fallbackFamily as QueryDocumentSnapshot<DocumentData>);
    }
  }

  const userResultSnapshot = await userResultById.get();
  const sessionIds = new Set<string>();
  if (userResultSnapshot.exists) {
    const userResultData = userResultSnapshot.data() as { tempSessionId?: string | null };
    if (userResultData?.tempSessionId) sessionIds.add(userResultData.tempSessionId);
  }

  userResultsByUserId.forEach((entry) => {
    const payload = entry.data() as { tempSessionId?: string | null };
    if (payload?.tempSessionId) sessionIds.add(payload.tempSessionId);
  });
  quizSessionsByUserId.forEach((entry) => sessionIds.add(entry.id));
  resultsByUserId.forEach((entry) => {
    const payload = entry.data() as { tempSessionId?: string | null };
    if (payload?.tempSessionId) sessionIds.add(payload.tempSessionId);
    sessionIds.add(entry.id);
  });

  return {
    profile,
    authUserExists: Boolean(authUser),
    targetEmail,
    userResultById,
    userResultsByUserId,
    quizResultsByUserId,
    quizSessionsByUserId,
    resultsByUserId,
    mailLogsByUserId,
    invitationsByInitiator,
    invitationsByPartnerEmail,
    familySnapshots: [...familyMap.values()],
    derivedSessionIds: sessionIds,
  };
}

async function cleanupPartnerAndFamilyReferences(params: {
  targetUserId: string;
  familySnapshots: QueryDocumentSnapshot<DocumentData>[];
}) {
  const counters: CleanupCounters = { deletedDocuments: 0, updatedDocuments: 0 };

  for (const familySnapshot of params.familySnapshots) {
    const family = familySnapshot.data() as FamilyDocument;
    const familyId = familySnapshot.id;
    const membership = deriveFamilyMembership(family, params.targetUserId);
    if (!membership.includesTarget) continue;

    if (!membership.remainingUserId) {
      await adminDb.recursiveDelete(familySnapshot.ref);
      counters.deletedDocuments += 1;
      counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.invitations, familyId);
      counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.quizResults, familyId);
      counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.jointResults, familyId);
      counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.quizSessions, familyId);
      counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.mailLogs, familyId);
      continue;
    }

    counters.updatedDocuments += await promoteRemainingUserToInitiator({
      familyId,
      remainingUserId: membership.remainingUserId,
      deletedUserId: params.targetUserId,
    });

    counters.updatedDocuments += await updateOwnershipCardsForDeletedUser({
      familyId,
      deletedUserId: params.targetUserId,
      actorUserId: membership.remainingUserId,
    });

    counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.invitations, familyId);
    counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.jointResults, familyId);
    counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.mailLogs, familyId);
    counters.deletedDocuments += await deleteCollectionByFamilyId(firestoreCollections.quizSessions, familyId);

    counters.deletedDocuments += await deleteSubcollection(familyId, 'teamCheckPreparations');
    counters.deletedDocuments += await deleteSubcollection(familyId, 'teamCheckRecords');
    counters.deletedDocuments += await deleteSubcollection(familyId, 'auditEvents');
  }

  return counters;
}

async function cleanupLegacyReferences(params: {
  targetUserId: string;
  targetEmail: string | null;
}) {
  const counters: CleanupCounters = { deletedDocuments: 0, updatedDocuments: 0 };

  const userReferenceCollections = [firestoreCollections.users, ...LEGACY_PERSONAL_COLLECTIONS];
  for (const collectionName of userReferenceCollections) {
    for (const field of OWNED_REFERENCE_FIELDS) {
      counters.deletedDocuments += await deleteCollectionByField(collectionName, field, params.targetUserId);
    }

    for (const field of RELATION_REFERENCE_FIELDS) {
      counters.updatedDocuments += await updateDocsFieldToNull(collectionName, field, params.targetUserId);
    }

    for (const field of RELATION_ARRAY_FIELDS) {
      counters.updatedDocuments += await removeUidFromArrayField(collectionName, field, params.targetUserId);
    }
  }

  if (params.targetEmail) {
    counters.deletedDocuments += await deleteCollectionByField(firestoreCollections.invitations, 'partnerEmail', params.targetEmail);
    for (const collectionName of LEGACY_PERSONAL_COLLECTIONS) {
      counters.deletedDocuments += await deleteCollectionByField(collectionName, 'email', params.targetEmail);
      counters.deletedDocuments += await deleteCollectionByField(collectionName, 'partnerEmail', params.targetEmail);
    }
  }

  return counters;
}

async function cleanupFirestoreUserData(params: {
  targetUserId: string;
  references: DeletionReferences;
}) {
  const counters: CleanupCounters = { deletedDocuments: 0, updatedDocuments: 0 };

  const referencesToDelete: DocumentReference<DocumentData>[] = [
    params.references.userResultById,
    ...params.references.userResultsByUserId.map((entry) => entry.ref),
    ...params.references.quizResultsByUserId.map((entry) => entry.ref),
    ...params.references.quizSessionsByUserId.map((entry) => entry.ref),
    ...params.references.resultsByUserId.map((entry) => entry.ref),
    ...params.references.mailLogsByUserId.map((entry) => entry.ref),
    ...params.references.invitationsByInitiator.map((entry) => entry.ref),
    ...params.references.invitationsByPartnerEmail.map((entry) => entry.ref),
    adminDb.collection(firestoreCollections.users).doc(params.targetUserId),
  ];

  counters.deletedDocuments += await deleteDocRefs(referencesToDelete);

  const sessionRefDeletes: DocumentReference<DocumentData>[] = [];
  params.references.derivedSessionIds.forEach((sessionId) => {
    sessionRefDeletes.push(adminDb.collection(firestoreCollections.quizAnswers).doc(sessionId));
    sessionRefDeletes.push(adminDb.collection(firestoreCollections.results).doc(sessionId));
  });
  counters.deletedDocuments += await deleteDocRefs(sessionRefDeletes);

  const legacyCounters = await cleanupLegacyReferences({
    targetUserId: params.targetUserId,
    targetEmail: params.references.targetEmail,
  });
  counters.deletedDocuments += legacyCounters.deletedDocuments;
  counters.updatedDocuments += legacyCounters.updatedDocuments;

  return counters;
}

async function cleanupAuthAccount(targetUserId: string, authUserExists: boolean) {
  if (!authUserExists) return false;

  try {
    await adminAuth.deleteUser(targetUserId);
    return true;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/user-not-found') return false;

    await adminAuth.updateUser(targetUserId, { disabled: true }).catch(() => undefined);
    throw error;
  }
}

function assertDeletionAuthorization(params: DeleteRequest) {
  if (params.mode === 'self') {
    if (params.actorUserId !== params.targetUserId) {
      throw new UserDeleteError('Du kannst nur dein eigenes Konto löschen.', 403, 'user_delete/forbidden_self');
    }
    return;
  }

  if (!params.actorIsAdmin) {
    throw new UserDeleteError('Nur Admins dürfen andere Konten löschen.', 403, 'user_delete/forbidden_admin');
  }
}

export class UserDeleteError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function executeUserDeletion(params: DeleteRequest): Promise<DeleteOutcome> {
  const startedAt = Date.now();
  let stage = 'init';

  logDelete('user.delete.requested', {
    actorUid: params.actorUserId,
    targetUid: params.targetUserId,
    mode: params.mode,
  });

  try {
    assertDeletionAuthorization(params);
    logDelete('user.delete.authorized', {
      actorUid: params.actorUserId,
      targetUid: params.targetUserId,
      mode: params.mode,
    });

    stage = 'collect_references';
    logDelete('user.delete.collect_references.start', {
      targetUid: params.targetUserId,
    });
    const references = await collectDeletionReferences(params.targetUserId);
    logDelete('user.delete.collect_references.success', {
      targetUid: params.targetUserId,
      familyCount: references.familySnapshots.length,
      hasProfile: Boolean(references.profile),
      hasAuthUser: references.authUserExists,
      sessionIdCount: references.derivedSessionIds.size,
    });

    await ensureNotLastAdmin(references.profile);

    stage = 'partner_cleanup';
    logDelete('user.delete.partner_cleanup.start', {
      targetUid: params.targetUserId,
      familyCount: references.familySnapshots.length,
    });
    const partnerCleanup = await cleanupPartnerAndFamilyReferences({
      targetUserId: params.targetUserId,
      familySnapshots: references.familySnapshots,
    });
    logDelete('user.delete.partner_cleanup.success', {
      targetUid: params.targetUserId,
      deletedDocuments: partnerCleanup.deletedDocuments,
      updatedDocuments: partnerCleanup.updatedDocuments,
    });

    stage = 'firestore_cleanup';
    logDelete('user.delete.firestore_cleanup.start', {
      targetUid: params.targetUserId,
    });
    const firestoreCleanup = await cleanupFirestoreUserData({
      targetUserId: params.targetUserId,
      references,
    });
    logDelete('user.delete.firestore_cleanup.success', {
      targetUid: params.targetUserId,
      deletedDocuments: firestoreCleanup.deletedDocuments,
      updatedDocuments: firestoreCleanup.updatedDocuments,
    });

    stage = 'auth_cleanup';
    logDelete('user.delete.auth_cleanup.start', {
      targetUid: params.targetUserId,
      authUserExists: references.authUserExists,
    });
    const authDeleted = await cleanupAuthAccount(params.targetUserId, references.authUserExists);
    logDelete('user.delete.auth_cleanup.success', {
      targetUid: params.targetUserId,
      authDeleted,
    });

    const deletedDocuments = partnerCleanup.deletedDocuments + firestoreCleanup.deletedDocuments;
    const updatedDocuments = partnerCleanup.updatedDocuments + firestoreCleanup.updatedDocuments;
    const alreadyDeleted = !references.profile
      && !references.authUserExists
      && deletedDocuments === 0
      && updatedDocuments === 0;

    logDelete('user.delete.completed', {
      actorUid: params.actorUserId,
      targetUid: params.targetUserId,
      mode: params.mode,
      alreadyDeleted,
      deletedDocuments,
      updatedDocuments,
      durationMs: Date.now() - startedAt,
    });

    return {
      success: true,
      targetUserId: params.targetUserId,
      alreadyDeleted,
      authDeleted,
      deletedDocuments,
      updatedDocuments,
    };
  } catch (error) {
    if (error instanceof UserDeleteError) {
      logDeleteError({
        actorUid: params.actorUserId,
        targetUid: params.targetUserId,
        mode: params.mode,
        stage,
        code: error.code,
        message: error.message,
      });
      throw error;
    }

    logDeleteError({
      actorUid: params.actorUserId,
      targetUid: params.targetUserId,
      mode: params.mode,
      stage,
      code: (error as { code?: string })?.code ?? 'user_delete/unexpected',
      message: error instanceof Error ? error.message : String(error),
    });
    throw new UserDeleteError(
      'Das Konto konnte nicht vollständig gelöscht werden.',
      500,
      'user_delete/unexpected',
    );
  }
}
