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

import { auth, db } from '@/lib/firebase';
import { buildJointInsights, computeCategoryScores, computeTotalScore, describeTotalScore } from '@/services/partnerResult';
import { sendJointResultReadyForActivationMail, sendPartnerInvite } from '@/services/invitePartner';
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
  return sendPartnerInvite(partnerEmail);
}

export async function resolveInvitationByToken(token: string) {
  const plainTokenSnap = await getDocs(query(collection(db, firestoreCollections.invitations), where('token', '==', token), limit(1)));
  let invitationSnapshot = plainTokenSnap;

  if (invitationSnapshot.empty) {
    const tokenHash = await sha256(token);
    invitationSnapshot = await getDocs(query(collection(db, firestoreCollections.invitations), where('tokenHash', '==', tokenHash), limit(1)));
  }

  if (invitationSnapshot.empty) {
    return { status: 'invalid' as const };
  }

  const invitation = { id: invitationSnapshot.docs[0].id, ...invitationSnapshot.docs[0].data() } as InvitationDocument;
  if (invitation.status === 'accepted') return { status: 'accepted' as const, invitation };

  if (invitation.expiresAt && Date.parse(invitation.expiresAt) < Date.now()) {
    await setDoc(doc(db, firestoreCollections.invitations, invitation.id), { status: 'expired' }, { merge: true });
    return { status: 'expired' as const, invitation };
  }

  return { status: 'valid' as const, invitation };
}

export async function startPartnerSession(invitation: InvitationDocument) {
  const sessionId = doc(collection(db, firestoreCollections.quizSessions)).id;
  const questionSetSnapshot = invitation.questionSetSnapshot
    ?? (invitation.questionIds?.length ? await getQuestionSnapshot(invitation.questionIds) : []);
  if (!questionSetSnapshot.length) {
    throw new Error('Der Fragenkatalog für die Einladung konnte nicht geladen werden.');
  }

  const payload: QuizSessionDocument = {
    id: sessionId,
    familyId: invitation.familyId,
    userId: null,
    role: 'partner',
    source: 'partner',
    questionSetId: invitation.questionSetId ?? `invite-${invitation.id}`,
    questionSetSnapshot,
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
  if (initiatorProfile?.email) {
    await sendJointResultReadyForActivationMail({
      jointResultId: jointId,
      familyId: family.id,
      initiatorEmail: initiatorProfile.email,
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
