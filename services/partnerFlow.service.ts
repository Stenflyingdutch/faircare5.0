import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { app, auth, db } from '@/lib/firebase';
import { sendAppMail } from '@/services/mail-client.service';
import { buildJointInsights, computeCategoryScores, computeTotalScore, describeTotalScore } from '@/services/partnerResult';
import { firestoreCollections } from '@/types/domain';
import type {
  AppUserProfile,
  FamilyDocument,
  FamilyRole,
  InvitationDocument,
  JointResultDocument,
  QuizResultDocument,
  QuizSessionDocument,
} from '@/types/partner-flow';
import type { OwnershipAnswer, QuestionTemplate } from '@/types/quiz';

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function sha256(value: string) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((v) => v.toString(16).padStart(2, '0')).join('');
}

export interface InviteDebugDetails {
  headline: string;
  userErrors: string[];
  configErrors: string[];
  serverErrors: string[];
  technicalDetails?: string[];
}

export class InviteFlowError extends Error {
  code: string;
  details: InviteDebugDetails;

  constructor(code: string, message: string, details: InviteDebugDetails) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function buildInviteError(
  code: string,
  headline: string,
  buckets: Partial<Omit<InviteDebugDetails, 'headline'>>,
  technicalDetails?: string[],
) {
  return new InviteFlowError(code, headline, {
    headline,
    userErrors: buckets.userErrors ?? [],
    configErrors: buckets.configErrors ?? [],
    serverErrors: buckets.serverErrors ?? [],
    technicalDetails,
  });
}

export async function ensureUserProfile(params: { userId: string; email: string; displayName?: string; role?: FamilyRole }) {
  const userRef = doc(db, firestoreCollections.users, params.userId);
  await setDoc(userRef, {
    id: params.userId,
    email: normalizeEmail(params.email),
    displayName: params.displayName ?? null,
    role: params.role ?? 'initiator',
    createdAt: nowIso(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function fetchAppUserProfile(userId: string) {
  const snapshot = await getDoc(doc(db, firestoreCollections.users, userId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as AppUserProfile;
}

async function getLatestInitiatorResult(userId: string) {
  const snap = await getDocs(query(collection(db, firestoreCollections.userResults), where('userId', '==', userId), limit(1)));
  if (snap.empty) return null;
  return snap.docs[0].data() as {
    questionIds: string[];
    answers: Partial<Record<string, OwnershipAnswer>>;
    filter: Record<string, string>;
    detailedReport?: { summary?: { selfPercent: number } };
  };
}

async function getQuestionSnapshot(questionIds: string[]): Promise<QuestionTemplate[]> {
  const { questionTemplates } = await import('@/data/questionTemplates');
  const lookup = new Map(questionTemplates.map((q) => [q.id, q]));
  return questionIds.map((id) => lookup.get(id)).filter(Boolean) as QuestionTemplate[];
}

export async function sendPartnerInvitation(partnerEmail: string) {
  const user = auth.currentUser;
  if (!user?.email) {
    throw buildInviteError(
      'unauthenticated',
      'Du bist nicht eingeloggt.',
      { userErrors: ['Bitte melde dich neu an und versuche es erneut.'] },
      ['request.auth fehlt'],
    );
  }

  const normalizedPartnerEmail = normalizeEmail(partnerEmail);
  if (!normalizedPartnerEmail) {
    throw buildInviteError('invalid-argument', 'Die E-Mail-Adresse fehlt.', {
      userErrors: ['Bitte gib eine E-Mail-Adresse ein.'],
    });
  }
  if (normalizedPartnerEmail === normalizeEmail(user.email)) {
    throw buildInviteError('invalid-argument', 'Diese E-Mail-Adresse kann nicht eingeladen werden.', {
      userErrors: ['Bitte gib die E-Mail-Adresse deines Partners ein (nicht deine eigene).'],
    });
  }

  const functions = getFunctions(app, 'europe-west3');
  const sendPartnerInvite = httpsCallable<{ partnerEmail: string }, { partnerEmail?: string }>(functions, 'sendPartnerInvite');
  try {
    const response = await sendPartnerInvite({ partnerEmail: normalizedPartnerEmail });
    return {
      partnerEmail: response.data?.partnerEmail ?? normalizedPartnerEmail,
    };
  } catch (error) {
    const callableError = error as { code?: string; message?: string; details?: unknown };
    console.error('[sendPartnerInvitation] Callable sendPartnerInvite failed', {
      code: callableError?.code,
      message: callableError?.message,
      details: callableError?.details,
    });

    const appEnv = (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'development').toLowerCase();
    const allowLocalFallback = appEnv !== 'production';
    const fallbackEligible = ['functions/internal', 'internal', 'functions/unavailable', 'functions/unimplemented']
      .includes(callableError?.code ?? '');

    if (allowLocalFallback && fallbackEligible) {
      console.info('[sendPartnerInvitation] Falling back to local invite flow', {
        appEnv,
        code: callableError?.code,
      });
      return sendPartnerInvitationFallback(normalizedPartnerEmail, user.uid);
    }

    throw buildInviteError(
      callableError?.code ?? 'internal',
      'Einladung konnte serverseitig nicht verarbeitet werden.',
      { serverErrors: ['Die Firebase Function sendPartnerInvite hat einen Fehler zurückgegeben.'] },
      [
        `code=${callableError?.code ?? 'unknown'}`,
        callableError?.message ?? 'keine message',
      ],
    );
  }
}

async function sendPartnerInvitationFallback(partnerEmail: string, userId: string) {
  console.info('[sendPartnerInvite:fallback] Function gestartet');
  console.info('[sendPartnerInvite:fallback] request.auth vorhanden', { hasAuth: Boolean(userId) });
  console.info('[sendPartnerInvite:fallback] partnerEmail vorhanden', { hasPartnerEmail: Boolean(partnerEmail) });

  try {
    const userProfile = await fetchAppUserProfile(userId);
    console.info('[sendPartnerInvite:fallback] User geladen', { userId, hasUserProfile: Boolean(userProfile) });

    const latestResult = await getLatestInitiatorResult(userId);
    if (!latestResult?.questionIds?.length) {
      throw buildInviteError(
        'failed-precondition',
        'Kein Initiator-Ergebnis gefunden.',
        { serverErrors: ['Der Fragenkatalog wurde noch nicht abgeschlossen oder konnte nicht geladen werden.'] },
      );
    }

    const questionSetSnapshot = await getQuestionSnapshot(latestResult.questionIds);
    if (!questionSetSnapshot.length) {
      throw buildInviteError(
        'failed-precondition',
        'Fragenkatalog konnte nicht geladen werden.',
        { serverErrors: ['Die Fragenliste ist leer oder ungültig.'] },
      );
    }

    const familyId = userProfile?.familyId ?? doc(collection(db, firestoreCollections.families)).id;
    if (userProfile?.familyId) {
      console.info('[sendPartnerInvite:fallback] Family geladen', { familyId });
    } else {
      await setDoc(doc(db, firestoreCollections.families, familyId), {
        id: familyId,
        initiatorUserId: userId,
        partnerUserId: null,
        status: 'invited',
        invitationId: null,
        createdAt: nowIso(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, firestoreCollections.users, userId), {
        familyId,
        role: 'initiator',
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.info('[sendPartnerInvite:fallback] Family erstellt', { familyId });
    }

    const invitationRef = doc(collection(db, firestoreCollections.invitations));
    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();

    await setDoc(invitationRef, {
      id: invitationRef.id,
      familyId,
      initiatorUserId: userId,
      partnerEmail,
      tokenHash,
      status: 'sent',
      sentAt: nowIso(),
      acceptedAt: null,
      expiresAt,
      questionSetId: `initiator-${userId}`,
      questionSetSnapshot,
      createdAt: nowIso(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, firestoreCollections.families, familyId), {
      invitationId: invitationRef.id,
      status: 'invited',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.info('[sendPartnerInvite:fallback] Invitation erstellt', { invitationId: invitationRef.id });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const inviteUrl = `${baseUrl}/invite/${token}`;
    console.info('[sendPartnerInvite:fallback] Mail-Provider gewählt', {
      provider: process.env.RESEND_API_KEY ? 'resend' : (process.env.SENDGRID_API_KEY ? 'sendgrid' : 'none'),
    });

    await sendAppMail({
      type: 'partner_invitation',
      to: partnerEmail,
      subject: 'Du wurdest zu FairCare eingeladen',
      familyId,
      invitationId: invitationRef.id,
      html: `
        <h2>Dein Partner hat dich zu FairCare eingeladen</h2>
        <p>Bitte öffne den folgenden Link, um den Partner-Test zu starten:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      `,
    });
    console.info('[sendPartnerInvite:fallback] Mailversand erfolgreich', {
      originalRecipient: partnerEmail,
      testRecipient: 'pa4sten@gmail.com (nicht-production in /api/mail)',
    });

    return { partnerEmail };
  } catch (error) {
    console.error('[sendPartnerInvite:fallback] Fehler im lokalen Invite-Flow', error);
    if (error instanceof InviteFlowError) throw error;
    throw buildInviteError(
      'internal',
      'Unbekannter Serverfehler im Invite-Flow.',
      { serverErrors: ['Ein unerwarteter Fehler ist aufgetreten.'] },
      [error instanceof Error ? error.message : String(error)],
    );
  }
}

export async function resolveInvitationByToken(token: string) {
  const tokenHash = await sha256(token);
  const snap = await getDocs(query(collection(db, firestoreCollections.invitations), where('tokenHash', '==', tokenHash), limit(1)));
  if (snap.empty) {
    return { status: 'invalid' as const };
  }

  const invitation = { id: snap.docs[0].id, ...snap.docs[0].data() } as InvitationDocument;
  if (invitation.status === 'accepted') return { status: 'accepted' as const, invitation };

  if (Date.parse(invitation.expiresAt) < Date.now()) {
    await setDoc(doc(db, firestoreCollections.invitations, invitation.id), { status: 'expired' }, { merge: true });
    return { status: 'expired' as const, invitation };
  }

  return { status: 'valid' as const, invitation };
}

export async function startPartnerSession(invitation: InvitationDocument) {
  const sessionId = doc(collection(db, firestoreCollections.quizSessions)).id;
  const payload: QuizSessionDocument = {
    id: sessionId,
    familyId: invitation.familyId,
    userId: null,
    role: 'partner',
    source: 'partner',
    questionSetId: invitation.questionSetId,
    questionSetSnapshot: invitation.questionSetSnapshot,
    filterAnswers: null,
    answers: {},
    createdAt: nowIso(),
    completedAt: null,
  };

  await setDoc(doc(db, firestoreCollections.quizSessions, sessionId), payload);
  return payload;
}

export async function savePartnerSessionAnswer(sessionId: string, answers: Partial<Record<string, OwnershipAnswer>>) {
  await setDoc(doc(db, firestoreCollections.quizSessions, sessionId), { answers, updatedAt: serverTimestamp() }, { merge: true });
}

export async function completePartnerSession(sessionId: string, answers: Partial<Record<string, OwnershipAnswer>>) {
  const sessionRef = doc(db, firestoreCollections.quizSessions, sessionId);
  const sessionSnapshot = await getDoc(sessionRef);
  if (!sessionSnapshot.exists()) throw new Error('Partner-Session nicht gefunden.');
  const session = sessionSnapshot.data() as QuizSessionDocument;

  const categoryScores = computeCategoryScores(session.questionSetSnapshot, answers);
  const totalScore = computeTotalScore(categoryScores);

  await setDoc(sessionRef, {
    answers,
    completedAt: nowIso(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return {
    session,
    resultDraft: {
      familyId: session.familyId,
      role: 'partner' as const,
      answers,
      categoryScores,
      totalScore,
      interpretation: describeTotalScore(totalScore),
      completedAt: nowIso(),
      questionSetSnapshot: session.questionSetSnapshot,
    },
  };
}

export async function finalizePartnerRegistration(params: {
  invitationToken: string;
  sessionId: string;
  userId: string;
  email: string;
  displayName?: string | null;
}) {
  const invitationState = await resolveInvitationByToken(params.invitationToken);
  if (invitationState.status !== 'valid') {
    throw new Error('Die Einladung ist ungültig oder nicht mehr aktiv.');
  }

  const invitation = invitationState.invitation;
  const normalizedEmail = normalizeEmail(params.email);
  if (normalizeEmail(invitation.partnerEmail) !== normalizedEmail) {
    throw new Error('Bitte registriere dich mit der eingeladenen E-Mail-Adresse.');
  }

  const sessionRef = doc(db, firestoreCollections.quizSessions, params.sessionId);
  const sessionSnapshot = await getDoc(sessionRef);
  if (!sessionSnapshot.exists()) throw new Error('Partner-Session fehlt.');
  const session = sessionSnapshot.data() as QuizSessionDocument;
  if (!session.completedAt) throw new Error('Bitte schließe erst den Partner-Test ab.');

  const categoryScores = computeCategoryScores(session.questionSetSnapshot, session.answers);
  const totalScore = computeTotalScore(categoryScores);

  const resultId = doc(collection(db, firestoreCollections.quizResults)).id;
  const createdAt = nowIso();

  await runTransaction(db, async (transaction) => {
    transaction.set(doc(db, firestoreCollections.users, params.userId), {
      id: params.userId,
      email: normalizedEmail,
      displayName: params.displayName ?? null,
      familyId: invitation.familyId,
      role: 'partner',
      createdAt,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    transaction.set(sessionRef, {
      userId: params.userId,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    transaction.set(doc(db, firestoreCollections.quizResults, resultId), {
      id: resultId,
      familyId: invitation.familyId,
      userId: params.userId,
      role: 'partner',
      answers: session.answers,
      categoryScores,
      totalScore,
      interpretation: describeTotalScore(totalScore),
      completedAt: session.completedAt!,
      questionSetSnapshot: session.questionSetSnapshot,
      createdAt,
    } satisfies QuizResultDocument);

    transaction.set(doc(db, firestoreCollections.invitations, invitation.id), {
      status: 'accepted',
      acceptedAt: createdAt,
    }, { merge: true });

    transaction.set(doc(db, firestoreCollections.families, invitation.familyId), {
      partnerUserId: params.userId,
      status: 'partner_completed',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  return { familyId: invitation.familyId };
}

async function fetchResultByRole(familyId: string, role: FamilyRole) {
  const snap = await getDocs(query(
    collection(db, firestoreCollections.quizResults),
    where('familyId', '==', familyId),
    where('role', '==', role),
    limit(1),
  ));
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as QuizResultDocument);
}

export async function buildOrUpdateInitiatorResult(userId: string) {
  const userResultSnap = await getDocs(query(collection(db, firestoreCollections.userResults), where('userId', '==', userId), limit(1)));
  if (userResultSnap.empty) return null;
  const userResult = userResultSnap.docs[0].data() as {
    answers: Partial<Record<string, OwnershipAnswer>>;
    questionIds: string[];
    summary?: { selfPercent: number };
  };
  const profile = await fetchAppUserProfile(userId);
  if (!profile?.familyId) return null;
  const questions = await getQuestionSnapshot(userResult.questionIds);
  const categoryScores = computeCategoryScores(questions, userResult.answers);
  const totalScore = computeTotalScore(categoryScores);

  const existing = await fetchResultByRole(profile.familyId, 'initiator');
  const resultId = existing?.id ?? doc(collection(db, firestoreCollections.quizResults)).id;

  await setDoc(doc(db, firestoreCollections.quizResults, resultId), {
    id: resultId,
    familyId: profile.familyId,
    userId,
    role: 'initiator',
    answers: userResult.answers,
    categoryScores,
    totalScore,
    interpretation: describeTotalScore(totalScore),
    completedAt: nowIso(),
    questionSetSnapshot: questions,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return resultId;
}

export async function triggerJointPreparationByPartner(userId: string) {
  const profile = await fetchAppUserProfile(userId);
  if (!profile?.familyId || profile.role !== 'partner') throw new Error('Nur Partner können diesen Schritt auslösen.');

  const familyRef = doc(db, firestoreCollections.families, profile.familyId);
  const familySnapshot = await getDoc(familyRef);
  if (!familySnapshot.exists()) throw new Error('Familie nicht gefunden.');
  const family = familySnapshot.data() as FamilyDocument;

  const partnerResult = await fetchResultByRole(profile.familyId, 'partner');
  if (!partnerResult) throw new Error('Partner-Ergebnis fehlt.');

  const initiatorResultId = await buildOrUpdateInitiatorResult(family.initiatorUserId);
  if (!initiatorResultId) throw new Error('Initiator-Ergebnis fehlt.');

  const initiatorResult = await fetchResultByRole(profile.familyId, 'initiator');
  if (!initiatorResult) throw new Error('Initiator-Ergebnis konnte nicht geladen werden.');

  const comparison = buildJointInsights(initiatorResult.categoryScores, partnerResult.categoryScores);
  const jointId = doc(collection(db, firestoreCollections.jointResults)).id;

  await setDoc(doc(db, firestoreCollections.jointResults, jointId), {
    id: jointId,
    familyId: profile.familyId,
    initiatorResultId,
    partnerResultId: partnerResult.id,
    comparison: {
      initiatorTotal: initiatorResult.totalScore,
      partnerTotal: partnerResult.totalScore,
      averageDifference: comparison.averageDifference,
    },
    categoryDifferences: comparison.categoryDifferences,
    insights: comparison.insights,
    status: 'pending_activation',
    createdAt: nowIso(),
    activatedAt: null,
  } satisfies JointResultDocument);

  await setDoc(familyRef, { status: 'joint_pending', updatedAt: serverTimestamp() }, { merge: true });

  const initiatorProfile = await fetchAppUserProfile(family.initiatorUserId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  const activationUrl = `${baseUrl}/joint-result/activate/${jointId}`;

  if (initiatorProfile?.email) {
    const recipient = initiatorProfile.email;
    await sendAppMail({
      type: 'joint_result_ready_for_activation',
      to: recipient,
      subject: 'Gemeinsames Ergebnis bereit zur Freischaltung',
      familyId: family.id,
      html: `
        <h2>Euer gemeinsames Ergebnis ist vorbereitet</h2>
        <p>Dein Partner hat den Fragenkatalog abgeschlossen.</p>
        <p>Du kannst die gemeinsame Auswertung jetzt freischalten.</p>
        <p><a href="${activationUrl}">Gesamtergebnis freischalten</a></p>
        <p>Alternativer Link: ${activationUrl}</p>
      `,
    });
  }

  return { initiatorName: initiatorProfile?.displayName || initiatorProfile?.email || null };
}

export async function activateJointResult(jointResultId: string, userId: string) {
  const jointRef = doc(db, firestoreCollections.jointResults, jointResultId);
  const jointSnapshot = await getDoc(jointRef);
  if (!jointSnapshot.exists()) throw new Error('Gesamtergebnis nicht gefunden.');
  const joint = jointSnapshot.data() as JointResultDocument;

  const familyRef = doc(db, firestoreCollections.families, joint.familyId);
  const familySnapshot = await getDoc(familyRef);
  if (!familySnapshot.exists()) throw new Error('Familie nicht gefunden.');
  const family = familySnapshot.data() as FamilyDocument;

  if (family.initiatorUserId !== userId) {
    throw new Error('Nur der Initiator darf das Gesamtergebnis aktivieren.');
  }

  if (joint.status === 'active' || family.status === 'joint_active') {
    return { alreadyActive: true };
  }

  await runTransaction(db, async (transaction) => {
    transaction.set(jointRef, {
      status: 'active',
      activatedAt: nowIso(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    transaction.set(familyRef, {
      status: 'joint_active',
      activatedAt: nowIso(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  return { alreadyActive: false };
}

export async function fetchDashboardBundle(userId: string) {
  const profile = await fetchAppUserProfile(userId);
  if (!profile) return { profile: null };

  let ownResult = profile.familyId
    ? await fetchResultByRole(profile.familyId, profile.role === 'partner' ? 'partner' : 'initiator')
    : null;

  let family: FamilyDocument | null = null;
  let joint: JointResultDocument | null = null;
  let initiatorResult: QuizResultDocument | null = null;
  let partnerResult: QuizResultDocument | null = null;

  if (profile.familyId) {
    const familySnap = await getDoc(doc(db, firestoreCollections.families, profile.familyId));
    family = familySnap.exists() ? (familySnap.data() as FamilyDocument) : null;

    const jointSnap = await getDocs(query(
      collection(db, firestoreCollections.jointResults),
      where('familyId', '==', profile.familyId),
      limit(1),
    ));
    if (!jointSnap.empty) {
      joint = { id: jointSnap.docs[0].id, ...jointSnap.docs[0].data() } as JointResultDocument;
    }

    if (family?.status === 'joint_active') {
      initiatorResult = await fetchResultByRole(profile.familyId, 'initiator');
      partnerResult = await fetchResultByRole(profile.familyId, 'partner');
    }
  }

  if (!ownResult && profile.role !== 'partner') {
    const raw = await getLatestInitiatorResult(userId);
    if (raw?.questionIds?.length) {
      const snapshot = await getQuestionSnapshot(raw.questionIds);
      const categoryScores = computeCategoryScores(snapshot, raw.answers);
      const totalScore = computeTotalScore(categoryScores);
      ownResult = {
        id: `local-${userId}`,
        familyId: profile.familyId ?? 'pending',
        userId,
        role: 'initiator',
        answers: raw.answers,
        categoryScores,
        totalScore,
        interpretation: describeTotalScore(totalScore),
        completedAt: nowIso(),
        questionSetSnapshot: snapshot,
      };
    }
  }

  return { profile, ownResult, family, joint, initiatorResult, partnerResult };
}

export async function persistMailDebugLog(entry: Record<string, unknown>) {
  await addDoc(collection(db, firestoreCollections.mailLogs), {
    ...entry,
    createdAt: nowIso(),
  });
}
