import { randomBytes } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

import { adminDb } from '../lib/firestore';

const INVITATION_TTL_HOURS = 96;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function assertValidEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Bitte gib eine gültige E-Mail-Adresse ein.');
  }
}

function createInvitationToken() {
  return randomBytes(32).toString('hex');
}

export async function createOrReuseInvitation(params: {
  initiatorUserId: string;
  initiatorEmail: string;
  partnerEmail: string;
}) {
  const initiatorEmail = normalizeEmail(params.initiatorEmail);
  const partnerEmail = normalizeEmail(params.partnerEmail);

  if (initiatorEmail === partnerEmail) {
    throw new HttpsError('invalid-argument', 'Du kannst dich nicht selbst einladen.');
  }

  const userRef = adminDb.collection('users').doc(params.initiatorUserId);

  const existingInvitationSnapshot = await adminDb
    .collection('invitations')
    .where('initiatorUserId', '==', params.initiatorUserId)
    .where('partnerEmail', '==', partnerEmail)
    .where('status', '==', 'sent')
    .limit(1)
    .get();

  if (!existingInvitationSnapshot.empty) {
    throw new HttpsError('already-exists', 'Es existiert bereits eine offene Einladung für diese E-Mail-Adresse.');
  }

  const userResultSnapshot = await adminDb
    .collection('userResults')
    .where('userId', '==', params.initiatorUserId)
    .limit(1)
    .get();

  if (userResultSnapshot.empty) {
    throw new HttpsError('failed-precondition', 'Bitte schließe zuerst deinen Test vollständig ab.');
  }

  const questionIds = userResultSnapshot.docs[0].get('questionIds') as string[] | undefined;
  if (!questionIds?.length) {
    throw new HttpsError('failed-precondition', 'Fragenkatalog für Einladung fehlt.');
  }

  return adminDb.runTransaction(async (tx) => {
    const userDoc = await tx.get(userRef);
    const userData = userDoc.exists ? userDoc.data() : null;

    const familyId = userData?.familyId ?? adminDb.collection('families').doc().id;
    const familyRef = adminDb.collection('families').doc(familyId);
    const familyDoc = await tx.get(familyRef);
    const familyData = familyDoc.exists ? familyDoc.data() : null;

    if (familyData?.partnerUserId) {
      throw new HttpsError('failed-precondition', 'Diese Familie hat bereits einen verbundenen Partner.');
    }

    const invitationRef = adminDb.collection('invitations').doc();
    const invitationToken = createInvitationToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_HOURS * 60 * 60 * 1000).toISOString();

    tx.set(familyRef, {
      id: familyId,
      initiatorUserId: params.initiatorUserId,
      partnerUserId: familyData?.partnerUserId ?? null,
      status: 'invited',
      invitationId: invitationRef.id,
      createdAt: familyData?.createdAt ?? now.toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    tx.set(userRef, {
      id: params.initiatorUserId,
      email: initiatorEmail,
      familyId,
      role: 'initiator',
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: userData?.createdAt ?? now.toISOString(),
    }, { merge: true });

    tx.set(invitationRef, {
      id: invitationRef.id,
      familyId,
      initiatorUserId: params.initiatorUserId,
      partnerEmail,
      token: invitationToken,
      status: 'sent',
      sentAt: now.toISOString(),
      acceptedAt: null,
      expiresAt,
      questionIds,
      questionSetId: `initiator-${params.initiatorUserId}-${now.getTime()}`,
    });

    return {
      invitationId: invitationRef.id,
      familyId,
      token: invitationToken,
      partnerEmail,
    };
  });
}
