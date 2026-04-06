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

import { app, auth, db, firebaseProjectId } from '@/lib/firebase';
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
import type { AgeGroup, OwnershipAnswer, QuestionTemplate, StressSelection } from '@/types/quiz';

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function deriveNameFromEmail(email?: string | null) {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return normalizeName(local);
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

export interface SendPartnerInviteResult {
  partnerEmail: string;
  delivery: 'email_sent' | 'saved_without_email';
  provider?: string;
  deliveryReason?: 'noop_provider' | 'mail_provider_unavailable';
}

function resolveRuntimeEnvironment() {
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'development').toLowerCase();
  const vercelEnv = (process.env.NEXT_PUBLIC_VERCEL_ENV ?? '').toLowerCase();
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isPreviewHost = host.endsWith('.vercel.app') || host.includes('-git-');
  return {
    appEnv,
    vercelEnv,
    host: host || null,
    isPreviewLike: vercelEnv === 'preview' || isPreviewHost,
  };
}

function resolveClientBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? 'http://localhost:3000';
}

function buildInviteHeadlineFromCode(code?: string) {
  if (!code) return 'Einladung konnte serverseitig nicht verarbeitet werden.';
  if (code.includes('invalid-argument')) return 'Ungültige E-Mail-Adresse.';
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return 'Bitte melde dich erneut an und versuche es nochmal.';
  if (code.includes('failed-precondition')) return 'Einladungsversand ist aktuell nicht verfügbar.';
  if (code.includes('unavailable') || code.includes('deadline-exceeded')) return 'Einladungsdienst ist gerade nicht erreichbar.';
  return 'Einladung konnte serverseitig nicht verarbeitet werden.';
}

type InviteBlockReasonCode =
  | 'own_email'
  | 'initiator_is_partner'
  | 'family_already_has_partner'
  | 'pending_invitation_same_email'
  | 'pending_invitation_other_email'
  | 'recipient_already_in_family';

function createInviteBlockReason(
  code: InviteBlockReasonCode,
  headline: string,
  userErrors: string[],
  technicalDetails: string[] = [],
) {
  return buildInviteError('failed-precondition', headline, { userErrors }, technicalDetails);
}

async function validatePartnerInvitationEligibility(params: {
  userId: string;
  userEmail: string;
  partnerEmail: string;
}) {
  const normalizedUserEmail = normalizeEmail(params.userEmail);
  const normalizedPartnerEmail = normalizeEmail(params.partnerEmail);

  if (normalizedPartnerEmail === normalizedUserEmail) {
    return createInviteBlockReason(
      'own_email',
      'Du hast deine eigene E-Mail-Adresse eingegeben.',
      ['Bitte gib die E-Mail-Adresse deines Partners ein (nicht deine eigene).'],
      ['rule=own_email'],
    );
  }

  const currentProfile = await fetchAppUserProfile(params.userId);
  if (currentProfile?.role === 'partner') {
    return createInviteBlockReason(
      'initiator_is_partner',
      'Partner-Accounts können keine neue Einladung versenden.',
      ['Bitte verwende den Initiator-Account, um eine Einladung zu senden.'],
      ['rule=initiator_is_partner'],
    );
  }

  if (currentProfile?.familyId) {
    const familySnapshot = await getDoc(doc(db, firestoreCollections.families, currentProfile.familyId));
    if (familySnapshot.exists()) {
      const family = familySnapshot.data() as FamilyDocument;
      if (family.partnerUserId || family.partnerRegistered) {
        return createInviteBlockReason(
          'family_already_has_partner',
          'Es ist bereits ein Partner mit eurem Konto verknüpft.',
          ['Eine neue Einladung ist erst möglich, wenn die bestehende Verknüpfung zurückgesetzt wurde.'],
          ['rule=family_already_has_partner'],
        );
      }

      if (family.invitationId) {
        const invitationSnapshot = await getDoc(doc(db, firestoreCollections.invitations, family.invitationId));
        if (invitationSnapshot.exists()) {
          const invitation = invitationSnapshot.data() as InvitationDocument;
          const isStillActive = invitation.status === 'sent' && Date.parse(invitation.expiresAt) >= Date.now();
          if (isStillActive) {
            const normalizedExistingPartnerEmail = normalizeEmail(invitation.partnerEmail);
            if (normalizedExistingPartnerEmail === normalizedPartnerEmail) {
              return createInviteBlockReason(
                'pending_invitation_same_email',
                'Für diese E-Mail läuft bereits eine Einladung.',
                ['Bitte verwende den vorhandenen Einladungslink oder sende später eine neue Einladung.'],
                ['rule=pending_invitation_same_email'],
              );
            }
            return createInviteBlockReason(
              'pending_invitation_other_email',
              'Es gibt bereits eine offene Einladung an eine andere E-Mail-Adresse.',
              ['Bitte schließe die bestehende Einladung zuerst ab oder lasse sie ablaufen.'],
              ['rule=pending_invitation_other_email'],
            );
          }
        }
      }
    }
  }

  const recipientUserSnap = await getDocs(query(
    collection(db, firestoreCollections.users),
    where('email', '==', normalizedPartnerEmail),
    limit(1),
  ));
  if (!recipientUserSnap.empty) {
    const recipientProfile = recipientUserSnap.docs[0].data() as AppUserProfile;
    if (recipientProfile.familyId) {
      return createInviteBlockReason(
        'recipient_already_in_family',
        'Diese E-Mail-Adresse ist bereits mit einem anderen Paar verknüpft.',
        ['Bitte nutze eine E-Mail-Adresse, die noch keinem bestehenden Paar zugeordnet ist.'],
        ['rule=recipient_already_in_family'],
      );
    }
  }

  return null;
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

export async function ensureUserProfile(params: { userId: string; email: string; displayName?: string | null; role?: FamilyRole }) {
  const userRef = doc(db, firestoreCollections.users, params.userId);
  const payload: Record<string, unknown> = {
    id: params.userId,
    email: normalizeEmail(params.email),
    createdAt: nowIso(),
    updatedAt: serverTimestamp(),
  };
  const normalizedDisplayName = params.displayName?.trim();
  if (typeof params.displayName === 'string' && normalizedDisplayName) {
    payload.displayName = normalizedDisplayName;
  }
  if (params.role) {
    payload.role = params.role;
  }
  await setDoc(userRef, payload, { merge: true });
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
    questionSetSnapshot?: QuestionTemplate[];
    answers: Partial<Record<string, OwnershipAnswer>>;
    stressCategories?: StressSelection[];
    filter: Record<string, string>;
    detailedReport?: { summary?: { selfPercent: number } };
  };
}

async function getQuestionSnapshot(questionIds: string[]): Promise<QuestionTemplate[]> {
  const { fetchQuestionTemplates } = await import('@/services/firestoreQuiz');
  const templates = await fetchQuestionTemplates();
  const lookup = new Map(templates.map((q) => [q.id, q]));
  return questionIds.map((id) => lookup.get(id)).filter(Boolean) as QuestionTemplate[];
}

export async function sendPartnerInvitation(partnerEmail: string, personalMessage?: string) {
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

  const eligibilityError = await validatePartnerInvitationEligibility({
    userId: user.uid,
    userEmail: user.email,
    partnerEmail: normalizedPartnerEmail,
  });
  if (eligibilityError) {
    console.warn('[sendPartnerInvitation] Einladung blockiert durch Validierungsregel', {
      rule: eligibilityError.details.technicalDetails?.[0] ?? 'unknown',
      appEnv: (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'development').toLowerCase(),
      partnerEmailDomain: normalizedPartnerEmail.split('@')[1] ?? 'invalid',
      userId: user.uid,
    });
    throw eligibilityError;
  }
  if (firebaseProjectId !== 'carefair5') {
    throw buildInviteError(
      'failed-precondition',
      'Falsches Firebase-Projekt konfiguriert.',
      {
        configErrors: [
          `Aktiv ist "${firebaseProjectId}", erwartet wird "carefair5".`,
          'Bitte NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local prüfen und Dev-Server neu starten.',
        ],
      },
      [`firebaseProjectId=${firebaseProjectId}`],
    );
  }

  const functions = getFunctions(app, 'europe-west3');
  const sendPartnerInvite = httpsCallable<{ partnerEmail: string; personalMessage?: string }, { partnerEmail?: string }>(functions, 'sendPartnerInvite');
  const runtime = resolveRuntimeEnvironment();
  console.info('[sendPartnerInvitation] gestartet', {
    hasUser: Boolean(user?.uid),
    hasUserEmail: Boolean(user?.email),
    project: firebaseProjectId,
    appEnv: runtime.appEnv,
    vercelEnv: runtime.vercelEnv || 'unknown',
    host: runtime.host,
    callableRegion: 'europe-west3',
    callableName: 'sendPartnerInvite',
  });

  try {
    console.info('[sendPartnerInvitation] callable request vorbereitet', {
      normalizedPartnerEmailDomain: normalizedPartnerEmail.split('@')[1] ?? 'invalid',
      hasPersonalMessage: Boolean(personalMessage?.trim()),
    });
    const response = await sendPartnerInvite({ partnerEmail: normalizedPartnerEmail, personalMessage: personalMessage?.trim() });
    console.info('[sendPartnerInvitation] callable request erfolgreich', {
      returnedPartnerEmail: response.data?.partnerEmail ?? normalizedPartnerEmail,
    });
    return {
      partnerEmail: response.data?.partnerEmail ?? normalizedPartnerEmail,
      delivery: 'email_sent',
    } satisfies SendPartnerInviteResult;
  } catch (error) {
    const callableError = error as { code?: string; message?: string; details?: unknown };
    const errorCode = callableError?.code ?? 'unknown';
    const errorMessage = callableError?.message ?? '';
    const fallbackEligibleCodes = [
      'functions/internal',
      'internal',
      'functions/unavailable',
      'unavailable',
      'functions/unimplemented',
      'unimplemented',
      'functions/deadline-exceeded',
      'deadline-exceeded',
      'functions/not-found',
      'not-found',
      'functions/unknown',
      'unknown',
    ];
    const fallbackEligibleMessage = /cors|network|fetch|failed to fetch|load failed|unreachable/i.test(errorMessage);
    const allowLocalFallback = runtime.appEnv !== 'production' || runtime.isPreviewLike;
    const fallbackEligible = fallbackEligibleCodes.includes(errorCode) || fallbackEligibleMessage;
    const fallbackDecision = allowLocalFallback && fallbackEligible;

    if (fallbackDecision) {
      console.info('[sendPartnerInvitation] Callable sendPartnerInvite unavailable, using fallback.', {
        appEnv: runtime.appEnv,
        vercelEnv: runtime.vercelEnv || 'unknown',
        host: runtime.host,
        code: errorCode,
        fallbackEligibleMessage,
      });
    } else {
      console.error('[sendPartnerInvitation] Callable sendPartnerInvite failed', {
        code: errorCode,
        message: errorMessage,
        details: callableError?.details,
        fallbackDecision,
        appEnv: runtime.appEnv,
        vercelEnv: runtime.vercelEnv || 'unknown',
      });
    }

    if (fallbackDecision) {
      console.info('[sendPartnerInvitation] Falling back to local invite flow', {
        appEnv: runtime.appEnv,
        vercelEnv: runtime.vercelEnv || 'unknown',
        host: runtime.host,
        code: errorCode,
      });
      return sendPartnerInvitationFallback(normalizedPartnerEmail, user.uid, personalMessage);
    }

    throw buildInviteError(
      errorCode,
      buildInviteHeadlineFromCode(errorCode),
      {
        serverErrors: ['Die Firebase Function sendPartnerInvite hat einen Fehler zurückgegeben.'],
        configErrors: ['Bitte Firebase Functions Logs für sendPartnerInvite (Region europe-west3) prüfen.'],
      },
      [
        `code=${errorCode}`,
        errorMessage || 'keine message',
        'region=europe-west3',
        `project=${firebaseProjectId}`,
        `appEnv=${runtime.appEnv}`,
        `vercelEnv=${runtime.vercelEnv || 'unknown'}`,
        `host=${runtime.host ?? 'unknown'}`,
        `fallbackEligible=${String(fallbackEligible)}`,
        `allowLocalFallback=${String(allowLocalFallback)}`,
      ],
    );
  }
}

async function sendPartnerInvitationFallback(partnerEmail: string, userId: string, personalMessage?: string) {
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

    const questionSetSnapshot = latestResult.questionSetSnapshot?.length
      ? latestResult.questionSetSnapshot
      : await getQuestionSnapshot(latestResult.questionIds);
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
        initiatorCompleted: true,
        partnerCompleted: false,
        initiatorRegistered: true,
        partnerRegistered: false,
        resultsUnlocked: false,
        sharedResultsOpened: false,
        unlockedAt: null,
        unlockedBy: null,
        sharedResultsOpenedAt: null,
        sharedResultsOpenedBy: null,
        resultsDiscussedAt: null,
        resultsDiscussedBy: null,
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
      personalMessage: personalMessage?.trim() || null,
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
      initiatorCompleted: true,
      initiatorRegistered: true,
      partnerCompleted: false,
      partnerRegistered: false,
      resultsUnlocked: false,
      sharedResultsOpened: false,
      unlockedAt: null,
      unlockedBy: null,
      sharedResultsOpenedAt: null,
      sharedResultsOpenedBy: null,
      resultsDiscussedAt: null,
      resultsDiscussedBy: null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.info('[sendPartnerInvite:fallback] Invitation erstellt', { invitationId: invitationRef.id });

    const baseUrl = resolveClientBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${token}`;
    console.info('[sendPartnerInvite:fallback] Einladungs-URL aufgelöst', {
      baseUrl,
      usedWindowOrigin: typeof window !== 'undefined' && window.location?.origin === baseUrl,
    });
    console.info('[sendPartnerInvite:fallback] Mail-Provider gewählt', {
      provider: process.env.RESEND_API_KEY ? 'resend' : (process.env.SENDGRID_API_KEY ? 'sendgrid' : 'none'),
    });

    console.info('[sendPartnerInvite:fallback] Mailversand gestartet', { partnerEmail });
    const runtime = resolveRuntimeEnvironment();
    let provider = 'unknown';
    try {
      const mailOutcome = await sendAppMail({
        type: 'partner_invitation',
        to: partnerEmail,
        subject: 'Mach den FairCare Test mit mir',
        familyId,
        invitationId: invitationRef.id,
        html: `
          <h2>Mach den FairCare Test mit mir</h2>
          <p>${personalMessage?.trim() || 'Ich habe den FairCare Test gemacht und würde mich freuen, wenn du ihn auch ausfüllst. Danach können wir unsere Ergebnisse gemeinsam anschauen.'}</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        `,
      });
      provider = String(mailOutcome?.result?.provider ?? 'unknown');
    } catch (mailError) {
      const mailErrorMessage = mailError instanceof Error ? mailError.message : String(mailError);
      const allowGracefulNoMail = runtime.appEnv !== 'production' || runtime.isPreviewLike;
      console.error('[sendPartnerInvite:fallback] Mailversand fehlgeschlagen', {
        appEnv: runtime.appEnv,
        vercelEnv: runtime.vercelEnv || 'unknown',
        allowGracefulNoMail,
        message: mailErrorMessage,
      });
      if (allowGracefulNoMail) {
        return {
          partnerEmail,
          delivery: 'saved_without_email',
          provider: 'mail_error',
          deliveryReason: 'mail_provider_unavailable',
        } satisfies SendPartnerInviteResult;
      }
      throw mailError;
    }
    console.info('[sendPartnerInvite:fallback] Mailversand abgeschlossen', {
      originalRecipient: partnerEmail,
      testRecipient: 'pa4sten@gmail.com (nicht-production in /api/mail)',
      provider,
    });

    if (provider === 'noop') {
      return {
        partnerEmail,
        delivery: 'saved_without_email',
        provider,
        deliveryReason: 'noop_provider',
      } satisfies SendPartnerInviteResult;
    }

    return {
      partnerEmail,
      delivery: 'email_sent',
      provider,
    } satisfies SendPartnerInviteResult;
  } catch (error) {
    console.error('[sendPartnerInvite:fallback] Fehler im lokalen Invite-Flow', error);
    if (error instanceof InviteFlowError) throw error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Kein Mail-Provider konfiguriert')) {
      throw buildInviteError(
        'failed-precondition',
        'Mail-Provider nicht konfiguriert.',
        {
          configErrors: [
            'Für lokalen Versand fehlt die Mail-Konfiguration.',
            'Setze MAIL_PROVIDER=resend + RESEND_API_KEY oder MAIL_PROVIDER=sendgrid + SENDGRID_API_KEY.',
            'Für reine lokale Smoke-Tests kannst du MAIL_PROVIDER=noop setzen.',
          ],
          serverErrors: ['Die Einladung wurde gespeichert, aber der Mailversand konnte nicht gestartet werden.'],
        },
        [errorMessage],
      );
    }
    if (errorMessage.includes('Mail provider error')) {
      throw buildInviteError(
        'internal',
        'Mailversand fehlgeschlagen.',
        {
          serverErrors: ['Die Einladung wurde gespeichert, aber der Mailversand ist fehlgeschlagen.'],
          configErrors: ['Bitte MAIL_PROVIDER, API-Key und Sender-Adresse prüfen.'],
        },
        [errorMessage],
      );
    }
    throw buildInviteError(
      'internal',
      'Unbekannter Serverfehler im Invite-Flow.',
      { serverErrors: ['Ein unerwarteter Fehler ist aufgetreten.'] },
      [errorMessage],
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

  const familySnapshot = await getDoc(doc(db, firestoreCollections.families, invitation.familyId));
  if (familySnapshot.exists()) {
    const family = familySnapshot.data() as FamilyDocument;
    if (family.partnerRegistered || family.partnerUserId) {
      return { status: 'accepted' as const, invitation };
    }
  }

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
    stressCategories: [],
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

export async function savePartnerFilterPerception(sessionId: string, value: string) {
  await setDoc(doc(db, firestoreCollections.quizSessions, sessionId), {
    filterAnswers: { perception: value },
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function savePartnerStressSelection(sessionId: string, stressSelection: StressSelection) {
  await setDoc(doc(db, firestoreCollections.quizSessions, sessionId), {
    stressCategories: stressSelection === 'keiner_genannten_bereiche' ? [] : [stressSelection],
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function completePartnerSession(
  sessionId: string,
  answers: Partial<Record<string, OwnershipAnswer>>,
  stressCategories: StressSelection[] = [],
) {
  const sessionRef = doc(db, firestoreCollections.quizSessions, sessionId);
  const sessionSnapshot = await getDoc(sessionRef);
  if (!sessionSnapshot.exists()) throw new Error('Partner-Session nicht gefunden.');
  const session = sessionSnapshot.data() as QuizSessionDocument;
  const perception = session.filterAnswers?.perception;
  if (!perception) throw new Error('Bitte beantworte zuerst die Wahrnehmungsfrage.');

  const categoryScores = computeCategoryScores(session.questionSetSnapshot, answers);
  const totalScore = computeTotalScore(categoryScores);

  await setDoc(sessionRef, {
    answers,
    stressCategories,
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
      stressCategories,
      questionSetSnapshot: session.questionSetSnapshot,
      filterAnswers: session.filterAnswers ?? null,
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

  const sessionRef = doc(db, firestoreCollections.quizSessions, params.sessionId);
  const sessionSnapshot = await getDoc(sessionRef);
  if (!sessionSnapshot.exists()) throw new Error('Partner-Session fehlt.');
  const session = sessionSnapshot.data() as QuizSessionDocument;
  if (session.familyId !== invitation.familyId) {
    throw new Error('Die Partner-Session passt nicht zur Einladung. Bitte starte den Link erneut.');
  }
  if (!session.completedAt) throw new Error('Bitte schließe erst den Partner-Test ab.');

  const categoryScores = computeCategoryScores(session.questionSetSnapshot, session.answers);
  const totalScore = computeTotalScore(categoryScores);

  const resultId = doc(collection(db, firestoreCollections.quizResults)).id;
  const createdAt = nowIso();
  const normalizedDisplayName = normalizeName(params.displayName?.trim()) || deriveNameFromEmail(normalizedEmail);

  await runTransaction(db, async (transaction) => {
    transaction.set(doc(db, firestoreCollections.users, params.userId), {
      id: params.userId,
      email: normalizedEmail,
      displayName: normalizeName(normalizedDisplayName) ?? null,
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
      filterPerceptionAnswer: session.filterAnswers?.perception ?? null,
      stressCategories: session.stressCategories ?? [],
      completedAt: session.completedAt!,
      questionSetSnapshot: session.questionSetSnapshot,
      createdAt,
    } satisfies QuizResultDocument);

    transaction.set(doc(db, firestoreCollections.families, invitation.familyId), {
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
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  const familyRef = doc(db, firestoreCollections.families, invitation.familyId);
  const familySnapshot = await getDoc(familyRef);
  if (familySnapshot.exists()) {
    const family = familySnapshot.data() as FamilyDocument;
    const initiatorProfile = await fetchAppUserProfile(family.initiatorUserId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const loginUrl = `${baseUrl}/login`;

    if (initiatorProfile?.email) {
      await sendAppMail({
        type: 'partner_completed_notify_initiator',
        to: initiatorProfile.email,
        subject: 'Dein Partner hat FairCare abgeschlossen',
        familyId: family.id,
        html: `
          <h2>Dein Partner hat FairCare abgeschlossen</h2>
          <p>Dein Partner hat den Test und die Registrierung erfolgreich abgeschlossen.</p>
          <p>Melde dich jetzt an, um die Partner- und Gesamtergebnisse freizuschalten.</p>
          <p><a href="${loginUrl}">Zum Login</a></p>
        `,
      });
    }
  }

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

async function upsertJointResult(familyId: string, initiatorResult: QuizResultDocument, partnerResult: QuizResultDocument) {
  const jointSnap = await getDocs(query(
    collection(db, firestoreCollections.jointResults),
    where('familyId', '==', familyId),
    limit(1),
  ));
  const jointId = jointSnap.empty ? doc(collection(db, firestoreCollections.jointResults)).id : jointSnap.docs[0].id;
  const comparison = buildJointInsights(initiatorResult.categoryScores, partnerResult.categoryScores);

  await setDoc(doc(db, firestoreCollections.jointResults, jointId), {
    id: jointId,
    familyId,
    initiatorResultId: initiatorResult.id,
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
  } satisfies JointResultDocument, { merge: true });

  return jointId;
}

export async function buildOrUpdateInitiatorResult(userId: string) {
  const userResultSnap = await getDocs(query(collection(db, firestoreCollections.userResults), where('userId', '==', userId), limit(1)));
  if (userResultSnap.empty) return null;
  const userResult = userResultSnap.docs[0].data() as {
    answers: Partial<Record<string, OwnershipAnswer>>;
    questionIds: string[];
    questionSetSnapshot?: QuestionTemplate[];
    stressCategories?: StressSelection[];
    filter?: { splitClarity?: string };
    summary?: { selfPercent: number };
  };
  const profile = await fetchAppUserProfile(userId);
  if (!profile?.familyId) return null;
  const questions = userResult.questionSetSnapshot?.length
    ? userResult.questionSetSnapshot
    : await getQuestionSnapshot(userResult.questionIds);
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
    filterPerceptionAnswer: userResult.filter?.splitClarity ?? null,
    stressCategories: userResult.stressCategories ?? [],
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

  const initiatorProfile = await fetchAppUserProfile(family.initiatorUserId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  const loginUrl = `${baseUrl}/login`;

  if (initiatorProfile?.email) {
    const recipient = initiatorProfile.email;
    await sendAppMail({
      type: 'partner_completed_notify_initiator',
      to: recipient,
      subject: 'Dein Partner hat FairCare abgeschlossen',
      familyId: family.id,
      html: `
        <h2>Dein Partner hat FairCare abgeschlossen</h2>
        <p>Dein Partner hat den Test und die Registrierung erfolgreich abgeschlossen.</p>
        <p>Melde dich jetzt an, um die Partner- und Gesamtergebnisse freizuschalten.</p>
        <p><a href="${loginUrl}">Zum Login</a></p>
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

  if (joint.status === 'active' || family.resultsUnlocked) {
    return { alreadyActive: true };
  }

  await runTransaction(db, async (transaction) => {
    const activatedAt = nowIso();
    transaction.set(jointRef, {
      status: 'active',
      activatedAt,
      updatedAt: serverTimestamp(),
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
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  const partnerProfile = family.partnerUserId ? await fetchAppUserProfile(family.partnerUserId) : null;
  if (partnerProfile?.email) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const loginUrl = `${baseUrl}/login`;
    await sendAppMail({
      type: 'results_unlocked_notify_partner',
      to: partnerProfile.email,
      subject: 'Euer gemeinsames FairCare-Ergebnis ist bereit',
      familyId: family.id,
      html: `
        <h2>Euer gemeinsames FairCare-Ergebnis ist bereit</h2>
        <p>Das gemeinsame Ergebnis wurde freigeschaltet.</p>
        <p>Melde dich an, um eure individuellen Ergebnisse und das Gesamtergebnis anzusehen.</p>
        <p><a href="${loginUrl}">Zum Login</a></p>
      `,
    });
  }

  return { alreadyActive: false };
}

export async function unlockPartnerAndJointResults(userId: string) {
  const profile = await fetchAppUserProfile(userId);
  if (!profile?.familyId) throw new Error('Keine Familie verknüpft.');

  const familyRef = doc(db, firestoreCollections.families, profile.familyId);
  const familySnapshot = await getDoc(familyRef);
  if (!familySnapshot.exists()) throw new Error('Familie nicht gefunden.');
  const family = familySnapshot.data() as FamilyDocument;
  if (family.initiatorUserId !== userId) throw new Error('Nur der Initiator darf freischalten.');
  if (!family.partnerUserId || !family.partnerRegistered || !family.partnerCompleted) {
    throw new Error('Der Partner ist noch nicht vollständig registriert.');
  }
  if (family.resultsUnlocked) return { alreadyActive: true };

  const initiatorResultId = await buildOrUpdateInitiatorResult(userId);
  if (!initiatorResultId) throw new Error('Initiator-Ergebnis fehlt.');
  const initiatorResult = await fetchResultByRole(profile.familyId, 'initiator');
  const partnerResult = await fetchResultByRole(profile.familyId, 'partner');
  if (!initiatorResult || !partnerResult) throw new Error('Ergebnisse sind noch nicht vollständig.');
  const jointId = await upsertJointResult(profile.familyId, initiatorResult, partnerResult);

  return activateJointResult(jointId, userId);
}

export async function openSharedResultsView(userId: string) {
  const profile = await fetchAppUserProfile(userId);
  if (!profile?.familyId) throw new Error('Keine Familie verknüpft.');
  const familyRef = doc(db, firestoreCollections.families, profile.familyId);
  const familySnapshot = await getDoc(familyRef);
  if (!familySnapshot.exists()) throw new Error('Familie nicht gefunden.');
  const family = familySnapshot.data() as FamilyDocument;
  const isMember = family.initiatorUserId === userId || family.partnerUserId === userId;
  if (!isMember) throw new Error('Kein Zugriff auf diese Familie.');
  if (!family.resultsUnlocked) throw new Error('Die Ergebnisse wurden noch nicht freigegeben.');
  if (family.sharedResultsOpened) return { alreadyOpened: true };

  await setDoc(familyRef, {
    status: 'joint_active',
    sharedResultsOpened: true,
    sharedResultsOpenedAt: nowIso(),
    sharedResultsOpenedBy: userId,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return { alreadyOpened: false };
}

export async function fetchDashboardBundle(userId: string) {
  const profile = await fetchAppUserProfile(userId);
  if (!profile) return { profile: null };

  let ownResult = profile.familyId
    ? await fetchResultByRole(profile.familyId, profile.role === 'partner' ? 'partner' : 'initiator')
    : null;

  if (ownResult && profile.role !== 'partner' && (!ownResult.stressCategories || ownResult.stressCategories.length === 0)) {
    const raw = await getLatestInitiatorResult(userId);
    if (raw?.stressCategories) {
      ownResult = {
        ...ownResult,
        stressCategories: raw.stressCategories,
      };
    }
  }

  let family: FamilyDocument | null = null;
  let joint: JointResultDocument | null = null;
  let initiatorResult: QuizResultDocument | null = null;
  let partnerResult: QuizResultDocument | null = null;
  let initiatorDisplayName: string | null = null;
  let partnerDisplayName: string | null = null;
  let invitationPartnerEmail: string | null = null;
  let ageGroupForOwnership: AgeGroup | null = null;

  if (profile.familyId) {
    const familySnap = await getDoc(doc(db, firestoreCollections.families, profile.familyId));
    family = familySnap.exists() ? (familySnap.data() as FamilyDocument) : null;
    if (family?.initiatorUserId) {
      const initiatorProfile = await fetchAppUserProfile(family.initiatorUserId);
      initiatorDisplayName = initiatorProfile?.displayName || deriveNameFromEmail(initiatorProfile?.email) || 'Initiator';
    }
    if (family?.partnerUserId) {
      const partnerProfile = await fetchAppUserProfile(family.partnerUserId);
      partnerDisplayName = partnerProfile?.displayName || deriveNameFromEmail(partnerProfile?.email) || null;
    }
    if (family?.invitationId) {
      const invitationSnap = await getDoc(doc(db, firestoreCollections.invitations, family.invitationId));
      if (invitationSnap.exists()) {
        const invitation = invitationSnap.data() as InvitationDocument;
        invitationPartnerEmail = invitation.partnerEmail ?? null;
        if (!partnerDisplayName) {
          partnerDisplayName = deriveNameFromEmail(invitationPartnerEmail);
        }
      }
    }

    const canSeeSharedResults = Boolean(family?.resultsUnlocked && family?.sharedResultsOpened);
    if (canSeeSharedResults) {
      const jointSnap = await getDocs(query(
        collection(db, firestoreCollections.jointResults),
        where('familyId', '==', profile.familyId),
        limit(1),
      ));
      if (!jointSnap.empty) {
        joint = { id: jointSnap.docs[0].id, ...jointSnap.docs[0].data() } as JointResultDocument;
      }
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
        // Für "Größte empfundene Belastung" wird die direkte Antwort der letzten Stressfrage übernommen.
        stressCategories: raw.stressCategories ?? [],
        completedAt: nowIso(),
        questionSetSnapshot: snapshot,
      };
    }
  }

  if (ownResult?.questionSetSnapshot?.length) {
    ageGroupForOwnership = ownResult.questionSetSnapshot[0]?.ageGroup ?? null;
  }
  if (!ageGroupForOwnership && profile.role !== 'partner') {
    const raw = await getLatestInitiatorResult(userId);
    const candidate = raw?.filter?.youngestAgeGroup;
    if (candidate && ['0_1', '1_3', '3_6', '6_10', '10_plus'].includes(candidate)) {
      ageGroupForOwnership = candidate as AgeGroup;
    }
  }

  return {
    profile,
    ownResult,
    family,
    joint,
    initiatorResult,
    partnerResult,
    initiatorDisplayName,
    partnerDisplayName,
    invitationPartnerEmail,
    ageGroupForOwnership,
  };
}

export async function persistMailDebugLog(entry: Record<string, unknown>) {
  await addDoc(collection(db, firestoreCollections.mailLogs), {
    ...entry,
    createdAt: nowIso(),
  });
}
