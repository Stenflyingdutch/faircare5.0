import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';
import { buildJointInsights, computeCategoryScores, computeTotalScore, describeTotalScore } from '@/services/partnerResult';
import { dispatchMail } from '@/services/server/mail.service';
import { buildDisplayName, normalizeEmailAddress, normalizePersonName } from '@/services/user-profile.service';
import { firestoreCollections } from '@/types/domain';
import type { AppUserProfile, FamilyDocument, InvitationDocument, JointResultDocument, QuizResultDocument, QuizSessionDocument } from '@/types/partner-flow';

function nowIso() {
  return new Date().toISOString();
}

function normalizeName(value?: string | null) {
  const trimmed = normalizePersonName(value);
  if (!trimmed) return null;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function deriveNameFromEmail(email?: string | null) {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return normalizeName(local);
}

function sanitizeInvitationToken(rawToken?: string | null) {
  if (!rawToken) return '';

  let token = rawToken.trim().replace(/\u200B/g, '');
  if (!token) return '';

  try {
    token = decodeURIComponent(token);
  } catch {
    // Keep raw token when it is not URI-encoded.
  }

  if (token.startsWith('http://') || token.startsWith('https://')) {
    try {
      const parsed = new URL(token);
      const fromQuery = parsed.searchParams.get('token')?.trim();
      if (fromQuery) {
        token = fromQuery;
      } else {
        const segments = parsed.pathname.split('/').filter(Boolean);
        token = segments.at(-1) ?? token;
      }
    } catch {
      // Ignore URL parsing issues and continue with fallback cleanup.
    }
  }

  token = token
    .replace(/^['"<(\[]+/, '')
    .replace(/['">)\].,;!?]+$/, '')
    .trim();

  return token.replace(/\s+/g, '');
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function isInvitationCompleted(status?: string | null) {
  return ['accepted', 'completed', 'consumed', 'used'].includes((status ?? '').toLowerCase());
}

function isInvitationRevoked(status?: string | null) {
  return ['revoked', 'cancelled', 'canceled'].includes((status ?? '').toLowerCase());
}

function resolveAppBaseUrl() {
  const explicitUrl = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitUrl) return explicitUrl.replace(/\/+$/, '');

  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelEnv === 'production' && productionDomain) {
    return `https://${productionDomain.replace(/\/+$/, '')}`;
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  }

  return 'http://localhost:3000';
}

async function queryInvitationByField(field: string, value: string) {
  const snapshot = await adminDb.collection(firestoreCollections.invitations).where(field, '==', value).limit(1).get();
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as InvitationDocument;
}

async function findInvitationByToken(token: string) {
  const normalizedToken = sanitizeInvitationToken(token);
  if (!normalizedToken) {
    throw new PartnerRegistrationFinalizeError('Einladungslink fehlt oder ist ungültig.', 400, 'partner_registration/missing_token');
  }

  const tokenCandidates = Array.from(new Set([normalizedToken, normalizedToken.toLowerCase()]));
  const hashCandidates = tokenCandidates.map((candidate) => sha256(candidate));

  for (const field of ['token', 'inviteToken']) {
    for (const tokenValue of tokenCandidates) {
      const invitation = await queryInvitationByField(field, tokenValue);
      if (invitation) return invitation;
    }
  }

  for (const field of ['tokenHash', 'inviteTokenHash', 'token_hash']) {
    for (const hashValue of hashCandidates) {
      const invitation = await queryInvitationByField(field, hashValue);
      if (invitation) return invitation;
    }
  }

  const directSnapshot = await adminDb.collection(firestoreCollections.invitations).doc(normalizedToken).get();
  if (directSnapshot.exists) {
    return { id: directSnapshot.id, ...directSnapshot.data() } as InvitationDocument;
  }

  throw new PartnerRegistrationFinalizeError('Diese Einladung wurde nicht gefunden.', 404, 'partner_registration/invite_not_found');
}

async function fetchUserProfile(userId: string) {
  const snapshot = await adminDb.collection(firestoreCollections.users).doc(userId).get();
  return snapshot.exists ? snapshot.data() as AppUserProfile : null;
}

async function fetchPartnerResultByFamily(familyId: string) {
  const snapshot = await adminDb.collection(firestoreCollections.quizResults)
    .where('familyId', '==', familyId)
    .where('role', '==', 'partner')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as QuizResultDocument;
}

async function fetchJointResultByFamily(familyId: string) {
  const snapshot = await adminDb.collection(firestoreCollections.jointResults)
    .where('familyId', '==', familyId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as JointResultDocument;
}

async function upsertJointResult(familyId: string, initiatorResult: QuizResultDocument, partnerResult: QuizResultDocument) {
  const existing = await fetchJointResultByFamily(familyId);
  const jointResultId = existing?.id ?? adminDb.collection(firestoreCollections.jointResults).doc().id;

  const comparison = {
    initiatorTotal: initiatorResult.totalScore,
    partnerTotal: partnerResult.totalScore,
    averageDifference: Math.round((Math.abs(initiatorResult.totalScore - partnerResult.totalScore) / 2) * 10) / 10,
  };
  const insights = buildJointInsights(initiatorResult.categoryScores, partnerResult.categoryScores);
  const categoryDifferences = Object.fromEntries(
    Object.entries(initiatorResult.categoryScores).map(([category, score]) => [
      category,
      Math.abs(score - (partnerResult.categoryScores as Record<string, number>)[category]),
    ]),
  );

  await adminDb.collection(firestoreCollections.jointResults).doc(jointResultId).set({
    id: jointResultId,
    familyId,
    initiatorResultId: initiatorResult.id,
    partnerResultId: partnerResult.id,
    comparison,
    categoryDifferences,
    insights,
    status: 'pending_activation',
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return jointResultId;
}

async function notifyInitiatorIfPossible(familyId: string, invitationId: string) {
  const familySnapshot = await adminDb.collection(firestoreCollections.families).doc(familyId).get();
  if (!familySnapshot.exists) return;

  const family = familySnapshot.data() as FamilyDocument;
  const initiatorProfile = await fetchUserProfile(family.initiatorUserId);
  if (!initiatorProfile?.email) return;

  const loginUrl = `${resolveAppBaseUrl()}/login`;

  try {
    console.info('invite.unlock_mail.start', { familyId, invitationId });
    const outcome = await dispatchMail({
      type: 'partner_completed_notify_initiator',
      to: initiatorProfile.email,
      originalRecipient: initiatorProfile.email,
      subject: 'Dein Partner hat FairCare abgeschlossen',
      familyId,
      invitationId,
      html: `
        <h2>Dein Partner hat FairCare abgeschlossen</h2>
        <p>Dein Partner hat den Test und die Registrierung erfolgreich abgeschlossen.</p>
        <p>Melde dich jetzt an, um die Partner- und Gesamtergebnisse freizuschalten.</p>
        <p><a href="${loginUrl}">Zum Login</a></p>
      `,
    });

    await adminDb.collection(outcome.collection).add(outcome.payload);
    console.info('invite.unlock_mail.success', { familyId, invitationId });
  } catch (error) {
    console.error('invite.unlock_mail.failed', {
      familyId,
      invitationId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export class PartnerRegistrationFinalizeError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function finalizePartnerRegistrationWithAdmin(params: {
  invitationToken: string;
  sessionId: string;
  userId: string;
  email: string;
  displayName?: string | null;
}) {
  console.info('invite.join.start', {
    userId: params.userId,
    hasSessionId: Boolean(params.sessionId),
    hasInvitationToken: Boolean(params.invitationToken),
  });

  const invitation = await findInvitationByToken(params.invitationToken);
  const invitationStatus = invitation.status?.toLowerCase() ?? '';
  const familyRef = adminDb.collection(firestoreCollections.families).doc(invitation.familyId);
  const familySnapshot = await familyRef.get();
  const family = familySnapshot.exists ? familySnapshot.data() as FamilyDocument : null;

  if (isInvitationRevoked(invitationStatus) || invitation.revokedAt) {
    throw new PartnerRegistrationFinalizeError('Diese Einladung wurde widerrufen.', 409, 'partner_registration/invite_revoked');
  }

  if (invitationStatus === 'expired') {
    throw new PartnerRegistrationFinalizeError('Diese Einladung ist abgelaufen.', 409, 'partner_registration/invite_expired');
  }

  if (family?.partnerUserId && family.partnerUserId !== params.userId) {
    throw new PartnerRegistrationFinalizeError('Diese Einladung wurde bereits verwendet.', 409, 'partner_registration/invite_completed');
  }

  if ((isInvitationCompleted(invitationStatus) || invitation.acceptedAt) && family?.partnerUserId !== params.userId) {
    throw new PartnerRegistrationFinalizeError('Diese Einladung wurde bereits verwendet.', 409, 'partner_registration/invite_completed');
  }

  if (family?.partnerUserId === params.userId && family.partnerRegistered && family.partnerCompleted) {
    console.info('invite.join.success', {
      familyId: invitation.familyId,
      invitationId: invitation.id,
      userId: params.userId,
      alreadyCompleted: true,
    });
    return { familyId: invitation.familyId, alreadyCompleted: true };
  }

  const sessionRef = adminDb.collection(firestoreCollections.quizSessions).doc(params.sessionId);
  const sessionSnapshot = await sessionRef.get();
  if (!sessionSnapshot.exists) {
    throw new PartnerRegistrationFinalizeError('Partner-Session fehlt.', 409, 'partner_registration/session_missing');
  }

  const session = sessionSnapshot.data() as QuizSessionDocument;
  if (session.familyId !== invitation.familyId) {
    throw new PartnerRegistrationFinalizeError('Die Partner-Session passt nicht zur Einladung. Bitte starte den Link erneut.', 409, 'partner_registration/session_family_mismatch');
  }
  if (session.userId && session.userId !== params.userId) {
    throw new PartnerRegistrationFinalizeError('Diese Partner-Session gehört bereits zu einem anderen Konto.', 409, 'partner_registration/session_claimed');
  }
  if (!session.completedAt) {
    throw new PartnerRegistrationFinalizeError('Bitte schließe erst den Partner-Test ab.', 409, 'partner_registration/session_incomplete');
  }

  const normalizedEmail = normalizeEmailAddress(params.email);
  const normalizedDisplayName = normalizeName(params.displayName?.trim()) || deriveNameFromEmail(normalizedEmail);
  const firstName = normalizedDisplayName?.split(' ')[0] ?? '';
  const lastName = normalizedDisplayName?.split(' ').slice(1).join(' ') ?? '';
  const categoryScores = computeCategoryScores(session.questionSetSnapshot, session.answers);
  const totalScore = computeTotalScore(categoryScores);
  const createdAt = nowIso();
  const existingPartnerResult = await fetchPartnerResultByFamily(invitation.familyId);
  const resultId = existingPartnerResult?.id ?? adminDb.collection(firestoreCollections.quizResults).doc().id;

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(adminDb.collection(firestoreCollections.users).doc(params.userId), {
      id: params.userId,
      email: normalizedEmail,
      displayName: buildDisplayName(firstName, lastName) || normalizeName(normalizedDisplayName) || null,
      firstName: normalizeName(firstName) ?? null,
      lastName: normalizeName(lastName) ?? null,
      familyId: invitation.familyId,
      role: 'partner',
      accountStatus: 'active',
      createdAt,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(sessionRef, {
      userId: params.userId,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(adminDb.collection(firestoreCollections.quizResults).doc(resultId), {
      id: resultId,
      familyId: invitation.familyId,
      userId: params.userId,
      role: 'partner',
      answers: session.answers,
      categoryScores,
      totalScore,
      interpretation: describeTotalScore(totalScore),
      filterPerceptionAnswer: session.filterAnswers?.perception ?? null,
      stressCategories: session.stressCategories ?? [],
      completedAt: session.completedAt,
      questionSetSnapshot: session.questionSetSnapshot,
      createdAt: existingPartnerResult?.createdAt ?? createdAt,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(familyRef, {
      partnerUserId: params.userId,
      status: 'partner_completed',
      initiatorRegistered: true,
      initiatorCompleted: true,
      partnerCompleted: true,
      partnerRegistered: true,
      resultsUnlocked: false,
      sharedResultsOpened: false,
      unlockedAt: null,
      unlockedBy: null,
      sharedResultsOpenedAt: null,
      sharedResultsOpenedBy: null,
      resultsDiscussedAt: null,
      resultsDiscussedBy: null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(adminDb.collection(firestoreCollections.invitations).doc(invitation.id), {
      status: 'accepted',
      acceptedAt: createdAt,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const initiatorResultSnapshot = await adminDb.collection(firestoreCollections.quizResults)
    .where('familyId', '==', invitation.familyId)
    .where('role', '==', 'initiator')
    .limit(1)
    .get();

  if (!initiatorResultSnapshot.empty) {
    const initiatorResult = { id: initiatorResultSnapshot.docs[0].id, ...initiatorResultSnapshot.docs[0].data() } as QuizResultDocument;
    const partnerResultSnapshot = await adminDb.collection(firestoreCollections.quizResults).doc(resultId).get();
    if (partnerResultSnapshot.exists) {
      const partnerResult = { id: partnerResultSnapshot.id, ...partnerResultSnapshot.data() } as QuizResultDocument;
      await upsertJointResult(invitation.familyId, initiatorResult, partnerResult);
    }
  }

  await notifyInitiatorIfPossible(invitation.familyId, invitation.id);
  console.info('invite.join.success', {
    familyId: invitation.familyId,
    invitationId: invitation.id,
    userId: params.userId,
    alreadyCompleted: false,
  });
  return { familyId: invitation.familyId, alreadyCompleted: false };
}
