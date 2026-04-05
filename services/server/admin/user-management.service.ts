import { randomUUID } from 'node:crypto';

import { getAdminProjectId, getGoogleAccessToken } from '@/services/server/admin/google-auth';
import {
  filterUsersBySearch,
  normalizeSortDirection,
  normalizeSortField,
  sortUsers,
} from '@/services/server/admin/user-management.logic';
import {
  decodeFirestoreValue,
  deleteDocument,
  getDocument,
  getDocumentId,
  patchDocument,
  runQuery,
  type FirestoreDocument,
} from '@/services/server/admin/firestore-rest';
import type { AdminActionAuditLog, AdminManagedUser } from '@/services/server/admin/types';

const USER_QUERY_LIMIT = 200;
const FAMILY_SUBCOLLECTIONS = ['ownershipCategories', 'ownershipCards', 'auditEvents', 'teamCheckPreparations', 'teamCheckRecords'];
const DIRECT_USER_COLLECTIONS = ['quizResults', 'quizSessions', 'userResults', 'quizAnswers', 'results', 'mailLogs'];

function toUserRecord(document: FirestoreDocument): AdminManagedUser {
  const fields = document.fields ?? {};
  return {
    id: getDocumentId(document.name),
    email: String(decodeFirestoreValue(fields.email) ?? ''),
    displayName: String(decodeFirestoreValue(fields.displayName) ?? ''),
    role: String(decodeFirestoreValue(fields.role) ?? 'user'),
    suspended: Boolean(decodeFirestoreValue(fields.suspended)),
    createdAt: (decodeFirestoreValue(fields.createdAt) as string | null) ?? null,
    updatedAt: (decodeFirestoreValue(fields.updatedAt) as string | null) ?? null,
    lastActivityAt: (decodeFirestoreValue(fields.lastActivityAt) as string | null) ?? null,
  };
}

export async function listUsersForAdmin(params: {
  search?: string | null;
  sortBy?: string | null;
  sortDirection?: string | null;
}) {
  const users = await runQuery('users', {
    orderBy: { field: 'createdAt', direction: 'DESCENDING' },
    limit: USER_QUERY_LIMIT,
  });

  const mapped = users.map((entry) => toUserRecord(entry));
  const filtered = filterUsersBySearch(mapped, params.search);

  const sortBy = normalizeSortField(params.sortBy);
  const sortDirection = normalizeSortDirection(params.sortDirection);

  return sortUsers(filtered, sortBy, sortDirection);
}

export const listUsers = listUsersForAdmin;

async function countAdmins() {
  const admins = await runQuery('users', { filters: [{ field: 'role', value: 'admin' }], limit: USER_QUERY_LIMIT });
  return admins.length;
}

async function lookupUserEmail(userId: string) {
  const userDoc = await getDocument(`users/${userId}`, ['email']);
  return String(decodeFirestoreValue(userDoc?.fields?.email) ?? '');
}

async function writeAuditLog(log: AdminActionAuditLog) {
  const logId = randomUUID();
  await patchDocument(`adminAuditLogs/${logId}`, {
    ...log,
    id: logId,
  });
}

async function updateAuthUserState(userId: string, disabled: boolean) {
  const token = await getGoogleAccessToken();
  const projectId = getAdminProjectId();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      localId: userId,
      disableUser: disabled,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth-Status konnte nicht gesetzt werden (${response.status}): ${text}`);
  }
}

async function deleteAuthUser(userId: string) {
  const token = await getGoogleAccessToken();
  const projectId = getAdminProjectId();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ localId: userId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Auth-Konto konnte nicht gelöscht werden (${response.status}): ${text}`);
  }
}

export async function suspendUser(params: { userId: string; actorUserId: string; actorEmail?: string }) {
  const target = await getDocument(`users/${params.userId}`, ['role', 'email']);
  if (!target) throw new Error('Nutzer nicht gefunden.');

  if (params.userId === params.actorUserId) {
    throw new Error('Du kannst dein eigenes Admin-Konto nicht sperren.');
  }

  const role = decodeFirestoreValue(target.fields?.role);
  if (role === 'admin' && await countAdmins() <= 1) {
    throw new Error('Der letzte Admin kann nicht gesperrt werden.');
  }

  await updateAuthUserState(params.userId, true);
  await patchDocument(`users/${params.userId}`, {
    suspended: true,
    suspendedAt: new Date().toISOString(),
    suspendedBy: params.actorUserId,
  });

  await writeAuditLog({
    action: 'suspend',
    targetUserId: params.userId,
    targetEmail: String(decodeFirestoreValue(target.fields?.email) ?? ''),
    performedBy: params.actorUserId,
    performedByEmail: params.actorEmail,
    success: true,
    createdAt: new Date().toISOString(),
  });
}

export async function unsuspendUser(params: { userId: string; actorUserId: string; actorEmail?: string }) {
  await getDocument(`users/${params.userId}`);

  await updateAuthUserState(params.userId, false);
  await patchDocument(`users/${params.userId}`, {
    suspended: false,
    suspendedAt: null,
    suspendedBy: null,
    unsuspendedAt: new Date().toISOString(),
    unsuspendedBy: params.actorUserId,
  });

  await writeAuditLog({
    action: 'unsuspend',
    targetUserId: params.userId,
    targetEmail: await lookupUserEmail(params.userId),
    performedBy: params.actorUserId,
    performedByEmail: params.actorEmail,
    success: true,
    createdAt: new Date().toISOString(),
  });
}

async function listFamilyIdsByUser(userId: string) {
  const [asInitiator, asPartner] = await Promise.all([
    runQuery('families', { filters: [{ field: 'initiatorUserId', value: userId }], limit: USER_QUERY_LIMIT }),
    runQuery('families', { filters: [{ field: 'partnerUserId', value: userId }], limit: USER_QUERY_LIMIT }),
  ]);

  return Array.from(new Set([...asInitiator, ...asPartner].map((entry) => getDocumentId(entry.name))));
}

async function deleteCollectionByField(collection: string, field: string, value: string) {
  const docs = await runQuery(collection, { filters: [{ field, value }], limit: USER_QUERY_LIMIT });
  await Promise.all(docs.map((entry) => deleteDocument(`${collection}/${getDocumentId(entry.name)}`)));
  return docs.length;
}

async function deleteFamilyTree(familyId: string) {
  let deleted = 0;
  for (const sub of FAMILY_SUBCOLLECTIONS) {
    const subDocs = await runQuery(sub, { fromParentPath: `families/${familyId}` });
    await Promise.all(subDocs.map((entry) => deleteDocument(`families/${familyId}/${sub}/${getDocumentId(entry.name)}`)));
    deleted += subDocs.length;
  }

  await deleteCollectionByField('quizResults', 'familyId', familyId);
  await deleteCollectionByField('jointResults', 'familyId', familyId);
  await deleteCollectionByField('invitations', 'familyId', familyId);

  await deleteDocument(`families/${familyId}`);
  return deleted + 1;
}

export async function deleteUserCascade(params: { userId: string; actorUserId: string; actorEmail?: string }) {
  if (params.userId === params.actorUserId) {
    throw new Error('Du kannst dein eigenes Admin-Konto nicht löschen.');
  }

  const target = await getDocument(`users/${params.userId}`, ['role', 'email']);
  if (!target) throw new Error('Nutzer nicht gefunden.');

  const role = decodeFirestoreValue(target.fields?.role);
  if (role === 'admin' && await countAdmins() <= 1) {
    throw new Error('Der letzte Admin kann nicht gelöscht werden.');
  }

  const deletedCollections: Record<string, number> = {};
  const familyIds: string[] = [];
  await updateAuthUserState(params.userId, true);

  try {
    for (const collectionName of DIRECT_USER_COLLECTIONS) {
      deletedCollections[collectionName] = await deleteCollectionByField(collectionName, 'userId', params.userId);
    }

    familyIds.push(...await listFamilyIdsByUser(params.userId));
    for (const familyId of familyIds) {
      deletedCollections[`family:${familyId}`] = await deleteFamilyTree(familyId);
    }

    await deleteDocument(`users/${params.userId}`);
    await deleteAuthUser(params.userId);
  } catch (error) {
    await writeAuditLog({
      action: 'delete',
      targetUserId: params.userId,
      targetEmail: String(decodeFirestoreValue(target.fields?.email) ?? ''),
      performedBy: params.actorUserId,
      performedByEmail: params.actorEmail,
      success: false,
      reason: (error as Error).message,
      createdAt: new Date().toISOString(),
      details: {
        deletedCollections,
        familyIds,
      },
    });
    throw error;
  }

  await writeAuditLog({
    action: 'delete',
    targetUserId: params.userId,
    targetEmail: String(decodeFirestoreValue(target.fields?.email) ?? ''),
    performedBy: params.actorUserId,
    performedByEmail: params.actorEmail,
    success: true,
    createdAt: new Date().toISOString(),
    details: {
      deletedCollections,
      familyIds,
    },
  });

  return {
    deletedCollections,
    familyIds,
  };
}
