import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';
import { buildJointInsights, computeCategoryScores, computeTotalScore, describeTotalScore } from '@/services/partnerResult';
import { MailDispatchError, dispatchMail, resolveRecipient, validateMailConfig } from '@/services/server/mail.service';
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

function maskEmailForLog(email?: string | null) {
  if (!email) return null;
  const [localPart, domainPart] = email.split('@');
  if (!localPart || !domainPart) return '***';
  if (localPart.length <= 2) return `**@${domainPart}`;
  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

function extractErrorCode(error: unknown) {
  if (error instanceof MailDispatchError) return error.code;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code ?? 'unknown');
  }
  return 'unknown';
}

function extractErrorProvider(error: unknown) {
  if (error instanceof MailDispatchError) return error.provider ?? null;
  return null;
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

const MENTAL_FAIRCARE_PUBLIC_URL = 'https://mental-faircare.de';

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

function resolveMentalFaircareLoginUrl() {
  const baseUrl = resolveAppBaseUrl();

  try {
    const parsed = new URL(baseUrl);
    const hostname = parsed.hostname.toLowerCase();
    const shouldKeepResolvedBaseUrl = hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname.endsWith('.vercel.app')
      || hostname === 'mental-faircare.de'
      || hostname.endsWith('.mental-faircare.de');

    if (shouldKeepResolvedBaseUrl) {
      return `${baseUrl}/login`;
    }
  } catch {
    // Fall back to the canonical production login if the configured base URL cannot be parsed.
  }

  return `${MENTAL_FAIRCARE_PUBLIC_URL}/login`;
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
  return fetchResultByFamilyAndRole(familyId, 'partner');
}

async function fetchResultByFamilyAndRole(familyId: string, role: 'initiator' | 'partner') {
  const snapshot = await adminDb.collection(firestoreCollections.quizResults)
    .where('familyId', '==', familyId)
    .where('role', '==', role)
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

async function fetchInvitationById(invitationId?: string | null) {
  if (!invitationId) return null;
  const snapshot = await adminDb.collection(firestoreCollections.invitations).doc(invitationId).get();
  return snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as InvitationDocument) : null;
}

async function upsertJointResult(familyId: string, initiatorResult: QuizResultDocument, partnerResult: QuizResultDocument) {
  const existing = await fetchJointResultByFamily(familyId);
  const jointResultId = existing?.id ?? adminDb.collection(firestoreCollections.jointResults).doc().id;

  const comparison = {
    initiatorTotal: initiatorResult.totalScore,
    partnerTotal: partnerResult.totalScore,
    averageDifference: Math.round((Math.abs(initiatorResult.totalScore - partnerResult.totalScore) / 2) * 10) / 10,
  };
  const insights = buildJointInsights(
    initiatorResult.categoryScores,
    partnerResult.categoryScores,
    initiatorResult.questionSetSnapshot[0]?.ageGroup,
  );
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
  console.info('invite.unlock_mail.trigger_check', {
    familyId,
    invitationId,
    mailType: 'partner_completed_notify_initiator',
    familyExists: familySnapshot.exists,
  });
  if (!familySnapshot.exists) return;

  const family = familySnapshot.data() as FamilyDocument;
  const initiatorProfile = await fetchUserProfile(family.initiatorUserId);
  console.info('invite.unlock_mail.trigger_check', {
    familyId,
    invitationId,
    mailType: 'partner_completed_notify_initiator',
    initiatorId: family.initiatorUserId,
    partnerId: family.partnerUserId ?? null,
    hasInitiatorEmail: Boolean(initiatorProfile?.email),
  });
  if (!initiatorProfile?.email) return;

  const baseUrl = resolveAppBaseUrl();
  const loginUrl = resolveMentalFaircareLoginUrl();
  const recipientMasked = maskEmailForLog(initiatorProfile.email);

  try {
    console.info('invite.unlock_mail.trigger_reached', {
      familyId,
      invitationId,
      mailType: 'partner_completed_notify_initiator',
      initiatorId: family.initiatorUserId,
      partnerId: family.partnerUserId ?? null,
      recipientMasked,
    });
    console.info('invite.unlock_mail.prepare.start', {
      familyId,
      invitationId,
      mailType: 'partner_completed_notify_initiator',
      recipientMasked,
      hasTestEmailOverride: Boolean(process.env.TEST_EMAIL_OVERRIDE),
      baseUrl,
    });
    const config = validateMailConfig();
    const recipient = resolveRecipient(initiatorProfile.email);
    console.info('invite.unlock_mail.prepare.success', {
      familyId,
      invitationId,
      mailType: 'partner_completed_notify_initiator',
      recipientMasked,
      provider: config.provider,
      overrideApplied: recipient.overrideApplied,
      baseUrl,
    });
    console.info('invite.unlock_mail.send.start', {
      familyId,
      invitationId,
      mailType: 'partner_completed_notify_initiator',
      recipientMasked,
      provider: config.provider,
      overrideApplied: recipient.overrideApplied,
      baseUrl,
    });
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
    console.info('invite.unlock_mail.send.success', {
      familyId,
      invitationId,
      mailType: 'partner_completed_notify_initiator',
      recipientMasked,
      provider: outcome.result.provider,
      overrideApplied: Boolean(outcome.payload.overrideApplied),
      baseUrl,
    });
  } catch (error) {
    console.error('invite.unlock_mail.send.failed', {
      familyId,
      invitationId,
      mailType: 'partner_completed_notify_initiator',
      recipientMasked,
      errorCode: extractErrorCode(error),
      provider: extractErrorProvider(error),
      hasTestEmailOverride: Boolean(process.env.TEST_EMAIL_OVERRIDE),
      baseUrl,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function notifyPartnerUnlockIfPossible(params: { family: FamilyDocument; jointId: string }) {
  const invitation = await fetchInvitationById(params.family.invitationId);
  const partnerProfile = params.family.partnerUserId ? await fetchUserProfile(params.family.partnerUserId) : null;
  const partnerEmail = normalizeEmailAddress(partnerProfile?.email || invitation?.partnerEmail || '');
  if (!partnerEmail) return;

  const baseUrl = resolveAppBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  const recipientMasked = maskEmailForLog(partnerEmail);

  try {
    console.info('invite.partner_unlock_mail.prepare.start', {
      familyId: params.family.id,
      invitationId: params.family.invitationId ?? null,
      mailType: 'results_unlocked_notify_partner',
      recipientMasked,
      hasTestEmailOverride: Boolean(process.env.TEST_EMAIL_OVERRIDE),
      baseUrl,
    });
    const config = validateMailConfig();
    const recipient = resolveRecipient(partnerEmail);
    console.info('invite.partner_unlock_mail.prepare.success', {
      familyId: params.family.id,
      invitationId: params.family.invitationId ?? null,
      mailType: 'results_unlocked_notify_partner',
      recipientMasked,
      provider: config.provider,
      overrideApplied: recipient.overrideApplied,
      baseUrl,
    });
    console.info('invite.partner_unlock_mail.send.start', {
      familyId: params.family.id,
      invitationId: params.family.invitationId ?? null,
      mailType: 'results_unlocked_notify_partner',
      recipientMasked,
      provider: config.provider,
      overrideApplied: recipient.overrideApplied,
      baseUrl,
    });
    const outcome = await dispatchMail({
      type: 'results_unlocked_notify_partner',
      to: partnerEmail,
      originalRecipient: partnerEmail,
      subject: 'Euer gemeinsames FairCare-Ergebnis ist bereit',
      familyId: params.family.id,
      invitationId: params.family.invitationId ?? undefined,
      html: `
        <h2>Euer gemeinsames FairCare-Ergebnis ist bereit</h2>
        <p>Das gemeinsame Ergebnis wurde freigeschaltet.</p>
        <p>Melde dich an, um eure individuellen Ergebnisse und das Gesamtergebnis anzusehen.</p>
        <p><a href="${loginUrl}">Zum Login</a></p>
      `,
    });
    await adminDb.collection(outcome.collection).add(outcome.payload);
    console.info('invite.partner_unlock_mail.send.success', {
      familyId: params.family.id,
      invitationId: params.family.invitationId ?? null,
      mailType: 'results_unlocked_notify_partner',
      recipientMasked,
      provider: outcome.result.provider,
      overrideApplied: Boolean(outcome.payload.overrideApplied),
      baseUrl,
      resultId: params.jointId,
    });
  } catch (error) {
    console.error('invite.partner_unlock_mail.send.failed', {
      familyId: params.family.id,
      invitationId: params.family.invitationId ?? null,
      mailType: 'results_unlocked_notify_partner',
      recipientMasked,
      provider: extractErrorProvider(error),
      errorCode: extractErrorCode(error),
      hasTestEmailOverride: Boolean(process.env.TEST_EMAIL_OVERRIDE),
      baseUrl,
      resultId: params.jointId,
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

export class PartnerFlowAdminError extends Error {
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
      partnerDisplayName: buildDisplayName(firstName, lastName) || normalizeName(normalizedDisplayName) || null,
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

export async function unlockJointResultsWithAdmin(userId: string) {
  const profile = await fetchUserProfile(userId);
  const familyId = profile?.familyId ?? null;

  console.info('initiator.results.generate.start', {
    authUid: userId,
    familyId,
    initiatorId: userId,
    partnerId: null,
    resultId: null,
    collection: firestoreCollections.families,
    path: familyId ? `${firestoreCollections.families}/${familyId}` : null,
  });

  try {
    if (!familyId) {
      const error = new PartnerFlowAdminError('Keine Familie verknüpft.', 409, 'partner_unlock/family_missing');
      console.error('initiator.results.generate.failed', {
        authUid: userId,
        familyId: null,
        initiatorId: userId,
        partnerId: null,
        resultId: null,
        collection: firestoreCollections.families,
        path: null,
        errorCode: error.code,
        message: error.message,
      });
      throw error;
    }

    const familyRef = adminDb.collection(firestoreCollections.families).doc(familyId);
    const familySnapshot = await familyRef.get();
    if (!familySnapshot.exists) {
      const error = new PartnerFlowAdminError('Familie nicht gefunden.', 404, 'partner_unlock/family_not_found');
      console.error('initiator.results.generate.failed', {
        authUid: userId,
        familyId,
        initiatorId: userId,
        partnerId: null,
        resultId: null,
        collection: firestoreCollections.families,
        path: `${firestoreCollections.families}/${familyId}`,
        errorCode: error.code,
        message: error.message,
      });
      throw error;
    }

    const family = familySnapshot.data() as FamilyDocument;
    const baseLog = {
      authUid: userId,
      familyId,
      initiatorId: family.initiatorUserId,
      partnerId: family.partnerUserId ?? null,
      resultId: null,
    };

    if (family.initiatorUserId !== userId) {
      const error = new PartnerFlowAdminError('Nur der Initiator darf freischalten.', 403, 'partner_unlock/forbidden');
      console.error('initiator.results.generate.failed', {
        ...baseLog,
        collection: firestoreCollections.families,
        path: `${firestoreCollections.families}/${familyId}`,
        errorCode: error.code,
        message: error.message,
      });
      throw error;
    }

    if (!family.partnerUserId || !family.partnerRegistered || !family.partnerCompleted) {
      const error = new PartnerFlowAdminError('Der Partner ist noch nicht vollständig registriert.', 409, 'partner_unlock/partner_incomplete');
      console.error('initiator.results.generate.failed', {
        ...baseLog,
        collection: firestoreCollections.families,
        path: `${firestoreCollections.families}/${familyId}`,
        errorCode: error.code,
        message: error.message,
      });
      throw error;
    }

    const initiatorResult = await fetchResultByFamilyAndRole(familyId, 'initiator');
    if (!initiatorResult) {
      const error = new PartnerFlowAdminError('Initiator-Ergebnis fehlt.', 409, 'partner_unlock/initiator_result_missing');
      console.error('initiator.results.generate.failed', {
        ...baseLog,
        collection: firestoreCollections.quizResults,
        path: `${firestoreCollections.quizResults}/(initiator:${familyId})`,
        errorCode: error.code,
        message: error.message,
      });
      throw error;
    }

    const partnerResult = await fetchResultByFamilyAndRole(familyId, 'partner');
    if (!partnerResult) {
      const error = new PartnerFlowAdminError('Partner-Ergebnis fehlt.', 409, 'partner_unlock/partner_result_missing');
      console.error('initiator.results.generate.failed', {
        ...baseLog,
        collection: firestoreCollections.quizResults,
        path: `${firestoreCollections.quizResults}/(partner:${familyId})`,
        errorCode: error.code,
        message: error.message,
      });
      throw error;
    }

    const jointId = await upsertJointResult(familyId, initiatorResult, partnerResult);
    if (family.resultsUnlocked) {
      console.info('initiator.results.generate.success', {
        ...baseLog,
        collection: firestoreCollections.jointResults,
        path: `${firestoreCollections.jointResults}/${jointId}`,
        resultId: jointId,
        alreadyActive: true,
      });
      return { alreadyActive: true, familyId, jointId };
    }

    const jointRef = adminDb.collection(firestoreCollections.jointResults).doc(jointId);
    const activatedAt = nowIso();
    await adminDb.runTransaction(async (transaction) => {
      transaction.set(jointRef, {
        status: 'active',
        activatedAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(familyRef, {
        status: 'joint_pending',
        resultsUnlocked: true,
        sharedResultsOpened: false,
        unlockedAt: activatedAt,
        unlockedBy: userId,
        sharedResultsOpenedAt: null,
        sharedResultsOpenedBy: null,
        resultsDiscussedAt: null,
        resultsDiscussedBy: null,
        activatedAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    await notifyPartnerUnlockIfPossible({ family: { ...family, id: familyId }, jointId });

    console.info('initiator.results.generate.success', {
      ...baseLog,
      collection: firestoreCollections.jointResults,
      path: `${firestoreCollections.jointResults}/${jointId}`,
      resultId: jointId,
      alreadyActive: false,
    });
    return { alreadyActive: false, familyId, jointId };
  } catch (error) {
    if (!(error instanceof PartnerFlowAdminError)) {
      console.error('initiator.results.generate.failed', {
        authUid: userId,
        familyId,
        initiatorId: userId,
        partnerId: null,
        resultId: null,
        collection: firestoreCollections.jointResults,
        path: familyId ? `${firestoreCollections.jointResults}/(family:${familyId})` : null,
        errorCode: extractErrorCode(error),
        message: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}
