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
import { onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { app, auth, db, firebaseProjectId } from '@/lib/firebase';
import { MailClientError, sendAppMail } from '@/services/mail-client.service';
import { buildJointInsights, computeCategoryScores, computeTotalScore, describeTotalScore } from '@/services/partnerResult';
import { logSignupError, logSignupInfo } from '@/services/signup-debug.service';
import { buildDisplayName, normalizeEmailAddress, normalizePersonName } from '@/services/user-profile.service';
import { firestoreCollections } from '@/types/domain';
import type {
  AppUserProfile,
  FamilyDocument,
  FamilyRole,
  InvitationDocument,
  InvitationResolution,
  JointResultDocument,
  QuizResultDocument,
  QuizSessionDocument,
} from '@/types/partner-flow';
import type { AgeGroup, ChildcareTag, OwnershipAnswer, QuestionTemplate, StressSelection } from '@/types/quiz';

type StoredUserResult = {
  questionIds: string[];
  questionSetSnapshot?: QuestionTemplate[];
  answers: Partial<Record<string, OwnershipAnswer>>;
  stressCategories?: StressSelection[];
  filter: Record<string, unknown>;
  detailedReport?: { summary?: { selfPercent: number } };
  summary?: { selfPercent: number };
};

function nowIso() {
  return new Date().toISOString();
}

const normalizeEmail = normalizeEmailAddress;

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

function parseChildcareTags(value: unknown): ChildcareTag[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map((entry) => entry.trim())
      : [];
  const allowed: ChildcareTag[] = ['none', 'kita', 'tagesmutter', 'family', 'babysitter'];
  return raw.filter((entry): entry is ChildcareTag => allowed.includes(entry as ChildcareTag));
}

function extractErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code ?? 'unknown');
  }
  return 'unknown';
}

function extractErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function shouldUseCallableInviteFallback(error: { code?: string; message?: string } | null | undefined) {
  const normalizedCode = (error?.code ?? '').toLowerCase();
  const normalizedMessage = (error?.message ?? '').toLowerCase();

  if (['functions/internal', 'internal', 'functions/unavailable', 'functions/unimplemented'].includes(normalizedCode)) {
    return true;
  }

  return [
    'failed to fetch',
    'load failed',
    'cors',
    'networkerror',
    'network request failed',
  ].some((fragment) => normalizedMessage.includes(fragment));
}

function resolveInviteRuntimeEnvironment() {
  const configuredEnv = (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'development').toLowerCase();

  if (typeof window === 'undefined') {
    return configuredEnv;
  }

  const hostname = window.location.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
  if (hostname.endsWith('.vercel.app')) return 'preview';

  return configuredEnv;
}

async function ensureFirestoreAuthReady(expectedUserId: string) {
  const currentUser = auth.currentUser;
  if (currentUser?.uid === expectedUserId) {
    await currentUser.getIdToken(true);
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve();
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (settled || user?.uid !== expectedUserId) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      try {
        await user.getIdToken(true);
      } catch {
        // Der folgende Firestore-Call liefert den finalen Fehlercode.
      }
      resolve();
    });
  });
}

function resolveAppBaseUrl() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

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

export function sanitizeInvitationToken(rawToken?: string | null) {
  if (!rawToken) return '';

  let token = rawToken.trim().replace(/\u200B/g, '');
  if (!token) return '';

  try {
    token = decodeURIComponent(token);
  } catch {
    // keep raw token when it is not URI-encoded
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
      // ignore URL parsing issues and continue with fallback cleanup
    }
  }

  token = token
    .replace(/^['"<(\[]+/, '')
    .replace(/['">)\].,;!?]+$/, '')
    .trim();

  return token.replace(/\s+/g, '');
}

function maskTokenForLog(token: string) {
  if (token.length <= 12) return token;
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isInvitationCompleted(status?: string | null) {
  return ['accepted', 'completed', 'consumed', 'used'].includes((status ?? '').toLowerCase());
}

function isInvitationRevoked(status?: string | null) {
  return ['revoked', 'cancelled', 'canceled'].includes((status ?? '').toLowerCase());
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

function wrapSignupFlowError(params: {
  message: string;
  failedStep: string;
  code?: string;
  collection?: string;
  queryName?: string;
  path?: string;
  cause: unknown;
}) {
  const wrapped = new Error(params.message) as Error & {
    code?: string;
    failedStep?: string;
    collection?: string;
    queryName?: string;
    path?: string;
    cause?: unknown;
  };
  wrapped.code = params.code ?? (params.cause as { code?: string })?.code;
  wrapped.failedStep = params.failedStep;
  wrapped.collection = params.collection;
  wrapped.queryName = params.queryName;
  wrapped.path = params.path;
  wrapped.cause = params.cause;
  return wrapped;
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

export async function ensureUserProfile(params: {
  userId: string;
  email: string;
  displayName?: string | null;
  role?: FamilyRole;
  inviteContextPresent?: boolean;
}) {
  await ensureFirestoreAuthReady(params.userId);
  const userRef = doc(db, firestoreCollections.users, params.userId);
  const userPath = `${firestoreCollections.users}/${params.userId}`;
  const inviteContextPresent = params.inviteContextPresent ?? false;

  logSignupInfo('signup.next_read.start', {
    step: 'ensureUserProfile',
    path: userPath,
    uid: params.userId,
    inviteContextPresent,
  });
  logSignupInfo('user_doc.read.start', {
    step: 'ensureUserProfile',
    path: userPath,
    uid: params.userId,
    inviteContextPresent,
  });

  let existingSnapshot;

  try {
    existingSnapshot = await getDoc(userRef);
    logSignupInfo('signup.next_read.success', {
      step: 'ensureUserProfile',
      path: userPath,
      uid: params.userId,
      inviteContextPresent,
      extra: { exists: existingSnapshot.exists() },
    });
    logSignupInfo('user_doc.read.success', {
      step: 'ensureUserProfile',
      path: userPath,
      uid: params.userId,
      inviteContextPresent,
      extra: { exists: existingSnapshot.exists() },
    });
  } catch (error) {
    logSignupError('signup.next_read.failed', error, {
      step: 'ensureUserProfile',
      path: userPath,
      uid: params.userId,
      inviteContextPresent,
    });
    logSignupError('user_doc.read.failed', error, {
      step: 'ensureUserProfile',
      path: userPath,
      uid: params.userId,
      inviteContextPresent,
    });
    const code = (error as { code?: string })?.code ?? '';
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      existingSnapshot = null;
    } else {
      throw error;
    }
  }

  const existingProfile = existingSnapshot?.exists() ? existingSnapshot.data() as AppUserProfile : null;
  const normalizedDisplayName = params.displayName?.trim();
  const firstName = normalizedDisplayName?.split(' ')[0] ?? existingProfile?.firstName ?? '';
  const lastName = normalizedDisplayName?.split(' ').slice(1).join(' ') ?? existingProfile?.lastName ?? '';
  const payload: Record<string, unknown> = {
    id: params.userId,
    email: normalizeEmail(params.email),
    createdAt: existingProfile?.createdAt ?? nowIso(),
    updatedAt: serverTimestamp(),
  };
  if (typeof params.displayName === 'string' && normalizedDisplayName) {
    payload.displayName = buildDisplayName(firstName, lastName) || normalizedDisplayName;
    payload.firstName = normalizeName(firstName) ?? null;
    payload.lastName = normalizeName(lastName) ?? null;
  }
  if (params.role) {
    payload.role = params.role;
  }

  logSignupInfo('user_profile.create.start', {
    step: 'ensureUserProfile',
    path: userPath,
    uid: params.userId,
    inviteContextPresent,
  });
  logSignupInfo('user_doc.create.start', {
    step: 'ensureUserProfile',
    path: userPath,
    uid: params.userId,
    inviteContextPresent,
  });

  try {
    await setDoc(userRef, payload, { merge: true });
    logSignupInfo('user_profile.create.success', {
      step: 'ensureUserProfile',
      path: userPath,
      uid: params.userId,
      inviteContextPresent,
    });
    logSignupInfo('user_doc.create.success', {
      step: 'ensureUserProfile',
      path: userPath,
      uid: params.userId,
      inviteContextPresent,
    });
  } catch (error) {
    logSignupError('user_profile.create.failed', error, {
      step: 'ensureUserProfile',
      path: userPath,
      uid: params.userId,
      inviteContextPresent,
    });
    logSignupError('user_doc.create.failed', error, {
      step: 'ensureUserProfile',
      path: userPath,
      uid: params.userId,
      inviteContextPresent,
    });
    throw error;
  }
}

export async function fetchAppUserProfile(userId: string) {
  const userPath = `${firestoreCollections.users}/${userId}`;

  if (!auth.currentUser) {
    logSignupInfo('dashboard.first_read.skipped_no_auth', {
      step: 'fetchAppUserProfile',
      path: userPath,
      uid: userId,
    });
    logSignupInfo('auth_required_loader_skipped', {
      step: 'fetchAppUserProfile',
      path: userPath,
      uid: userId,
      extra: { loader: 'fetchAppUserProfile' },
    });
    return null;
  }

  logSignupInfo('dashboard.first_read.start', {
    step: 'fetchAppUserProfile',
    path: userPath,
    uid: userId,
  });
  let snapshot;
  try {
    snapshot = await getDoc(doc(db, firestoreCollections.users, userId));
  } catch (error) {
    logSignupError('dashboard.first_read.failed', error, {
      step: 'fetchAppUserProfile',
      path: userPath,
      uid: userId,
    });
    throw error;
  }
  logSignupInfo('dashboard.first_read.success', {
    step: 'fetchAppUserProfile',
    path: userPath,
    uid: userId,
    extra: { exists: snapshot.exists() },
  });
  if (!snapshot.exists()) return null;
  return snapshot.data() as AppUserProfile;
}

async function getLatestInitiatorResult(userId: string) {
  const resultPath = `${firestoreCollections.userResults}/${userId}`;
  logSignupInfo('initiator_result.read.start', {
    step: 'getLatestInitiatorResult',
    path: resultPath,
    uid: userId,
  });
  let snapshot;
  try {
    snapshot = await getDoc(doc(db, firestoreCollections.userResults, userId));
  } catch (error) {
    logSignupError('initiator_result.read.failed', error, {
      step: 'getLatestInitiatorResult',
      path: resultPath,
      uid: userId,
    });
    throw wrapSignupFlowError({
      message: 'Initiator-Ergebnis konnte nicht gelesen werden.',
      failedStep: 'getLatestInitiatorResult.read',
      collection: firestoreCollections.userResults,
      path: resultPath,
      cause: error,
    });
  }
  logSignupInfo('initiator_result.read.success', {
    step: 'getLatestInitiatorResult',
    path: resultPath,
    uid: userId,
    extra: { exists: snapshot.exists() },
  });
  if (!snapshot.exists()) return null;
  return snapshot.data() as StoredUserResult;
}

async function getQuestionSnapshot(questionIds: string[]): Promise<QuestionTemplate[]> {
  const { fetchQuestionTemplates } = await import('@/services/firestoreQuiz');
  const templates = await fetchQuestionTemplates();
  const lookup = new Map(templates.map((q) => [q.id, q]));
  return questionIds.map((id) => lookup.get(id)).filter(Boolean) as QuestionTemplate[];
}

export async function sendPartnerInvitation(partnerEmail: string, personalMessage?: string) {
  console.info('invite.create.start', { hasPartnerEmail: Boolean(partnerEmail), hasPersonalMessage: Boolean(personalMessage?.trim()) });
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
  try {
    const response = await sendPartnerInvite({ partnerEmail: normalizedPartnerEmail, personalMessage: personalMessage?.trim() });
    console.info('invite.create.success', { delivery: 'email_sent', path: 'callable' });
    return {
      partnerEmail: response.data?.partnerEmail ?? normalizedPartnerEmail,
      delivery: 'email_sent',
    } satisfies SendPartnerInviteResult;
  } catch (error) {
    const callableError = error as { code?: string; message?: string; details?: unknown };
    const appEnv = resolveInviteRuntimeEnvironment();
    const fallbackEligible = shouldUseCallableInviteFallback(callableError);

    if (fallbackEligible) {
      console.info('[sendPartnerInvitation] Callable sendPartnerInvite unavailable, using fallback.', {
        appEnv,
        code: callableError?.code,
        message: callableError?.message,
      });
    } else {
      console.error('mail.invite.callable_error', {
        code: callableError?.code,
        message: callableError?.message,
        details: callableError?.details,
      });
    }

    if (fallbackEligible) {
      console.info('mail.invite.callable_fallback', {
        appEnv,
        code: callableError?.code,
      });
      return sendPartnerInvitationFallback(normalizedPartnerEmail, user.uid, personalMessage);
    }

    throw buildInviteError(
      callableError?.code ?? 'internal',
      'Einladung konnte serverseitig nicht verarbeitet werden.',
      {
        serverErrors: ['Die Firebase Function sendPartnerInvite hat einen Fehler zurückgegeben.'],
        configErrors: ['Bitte Firebase Functions Logs für sendPartnerInvite (Region europe-west3) prüfen.'],
      },
      [
        `code=${callableError?.code ?? 'unknown'}`,
        callableError?.message ?? 'keine message',
        'region=europe-west3',
        `project=${firebaseProjectId}`,
      ],
    );
  }
}

async function sendPartnerInvitationFallback(partnerEmail: string, userId: string, personalMessage?: string) {
  console.info('mail.invite.start', { hasAuth: Boolean(userId), hasPartnerEmail: Boolean(partnerEmail) });

  try {
    const userProfile = await fetchAppUserProfile(userId);
    const initiatorDisplayName = normalizeName(userProfile?.displayName) || deriveNameFromEmail(userProfile?.email);
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
        initiatorDisplayName,
        partnerDisplayName: null,
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
      initiatorDisplayName,
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
    console.info('invite.persist.success', { invitationId: invitationRef.id, familyId, path: 'fallback' });

    await setDoc(doc(db, firestoreCollections.families, familyId), {
      invitationId: invitationRef.id,
      initiatorDisplayName,
      partnerDisplayName: null,
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

    const baseUrl = resolveAppBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${token}`;
    console.info('invite.mail.prepare', { invitationId: invitationRef.id, familyId });
    console.info('[sendPartnerInvite:fallback] Mail-Provider gewählt', {
      provider: process.env.RESEND_API_KEY ? 'resend' : (process.env.SENDGRID_API_KEY ? 'sendgrid' : 'none'),
    });

    console.info('mail.invite.provider_start', { partnerEmailMasked: partnerEmail.replace(/(^..).+(@.+$)/, '$1***$2') });
    const mailOutcome = await sendAppMail({
      type: 'partner_invitation',
      to: partnerEmail,
      subject: 'Mach das FairCare Quiz mit mir',
      familyId,
      invitationId: invitationRef.id,
      html: `
        <h2>Mach das FairCare Quiz mit mir</h2>
        <p>${personalMessage?.trim() || 'Ich habe das FairCare Quiz gemacht und würde mich freuen, wenn du es auch ausfüllst. Danach können wir unsere Ergebnisse gemeinsam anschauen.'}</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      `,
    });
    const provider = String(mailOutcome?.result?.provider ?? 'unknown');
    console.info('mail.invite.success', {
      originalRecipient: partnerEmail,
      actualRecipient: mailOutcome?.payload?.actualRecipient ?? partnerEmail,
      overrideApplied: Boolean(mailOutcome?.payload?.overrideApplied),
      environment: mailOutcome?.payload?.environment ?? 'unknown',
      provider,
    });
    console.info('invite.mail.send.success', { invitationId: invitationRef.id, familyId, provider });

    if (provider === 'noop') {
      console.info('invite.create.success', { delivery: 'saved_without_email', path: 'fallback', provider });
      return {
        partnerEmail,
        delivery: 'saved_without_email',
        provider,
      } satisfies SendPartnerInviteResult;
    }

    console.info('invite.create.success', { delivery: 'email_sent', path: 'fallback', provider });
    return {
      partnerEmail,
      delivery: 'email_sent',
      provider,
    } satisfies SendPartnerInviteResult;
  } catch (error) {
    if (error instanceof InviteFlowError) throw error;

    if (error instanceof MailClientError) {
      if (error.category === 'validation_error') {
        console.error('mail.invite.validation_failed', { code: error.code });
        console.error('invite.mail.send.failed', { code: error.code, category: error.category });
        throw buildInviteError('invalid-argument', 'Die Einladung konnte nicht gesendet werden. Bitte prüfe die E-Mail-Adresse.', {
          userErrors: ['Bitte gib eine gültige E-Mail-Adresse ein.'],
        }, [error.code ?? error.message]);
      }

      if (error.category === 'config_error') {
        console.error('mail.invite.config_error', { code: error.code });
        console.error('invite.mail.send.failed', { code: error.code, category: error.category });
        throw buildInviteError('failed-precondition', 'Die Einladung konnte nicht gesendet werden, weil die Mail-Konfiguration unvollständig ist.', {
          configErrors: [
            'Erforderlich: MAIL_PROVIDER, MAIL_FROM und der passende API-Key.',
            'Für Resend: MAIL_PROVIDER=resend + RESEND_API_KEY + verifizierte MAIL_FROM-Domain.',
            'Für SendGrid: MAIL_PROVIDER=sendgrid + SENDGRID_API_KEY + verifizierter Sender.',
          ],
        }, [error.code ?? error.message]);
      }

      if (error.category === 'provider_error') {
        console.error('mail.invite.provider_error', { code: error.code });
        console.error('invite.mail.send.failed', { code: error.code, category: error.category });
        throw buildInviteError('internal', 'Die Einladung konnte nicht gesendet werden. Bitte später erneut versuchen.', {
          serverErrors: ['Die Einladung wurde gespeichert, aber der Mail-Provider hat den Versand abgelehnt.'],
        }, [error.code ?? error.message]);
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('mail.invite.unexpected_error', { errorMessage });
    console.error('invite.mail.send.failed', { code: 'unexpected_error', category: 'server_error' });
    throw buildInviteError(
      'internal',
      'Die Einladung konnte nicht gesendet werden. Bitte später erneut versuchen.',
      { serverErrors: ['Ein unerwarteter Serverfehler ist aufgetreten.'] },
      [errorMessage],
    );
  }
}

export async function resolveInvitationByToken(token: string): Promise<InvitationResolution> {
  const normalizedToken = sanitizeInvitationToken(token);
  if (!normalizedToken) {
    return { status: 'invalid', reason: token ? 'invalid_route_params' : 'missing_token' };
  }

  console.info('invite.lookup.start', {
    token: maskTokenForLog(normalizedToken),
    tokenLength: normalizedToken.length,
  });

  try {
    const invitationCollection = collection(db, firestoreCollections.invitations);
    const tokenCandidates = Array.from(new Set([normalizedToken, normalizedToken.toLowerCase()]));
    const hashCandidates = await Promise.all(tokenCandidates.map((candidate) => sha256(candidate)));

    let invitation: InvitationDocument | null = null;

    const plainTokenFields = ['token', 'inviteToken'];
    for (const plainField of plainTokenFields) {
      for (const tokenCandidate of tokenCandidates) {
        const snap = await getDocs(query(invitationCollection, where(plainField, '==', tokenCandidate), limit(1)));
        if (!snap.empty) {
          invitation = { id: snap.docs[0].id, ...snap.docs[0].data() } as InvitationDocument;
          break;
        }
      }
      if (invitation) break;
    }

    const hashFields = ['tokenHash', 'inviteTokenHash', 'token_hash'];
    if (!invitation) {
      for (const hashField of hashFields) {
        for (const hashValue of hashCandidates) {
          const snap = await getDocs(query(invitationCollection, where(hashField, '==', hashValue), limit(1)));
          if (!snap.empty) {
            invitation = { id: snap.docs[0].id, ...snap.docs[0].data() } as InvitationDocument;
            break;
          }
        }
        if (invitation) break;
      }
    }

    if (!invitation) {
      const directIdSnap = await getDoc(doc(db, firestoreCollections.invitations, normalizedToken));
      if (directIdSnap.exists()) {
        invitation = { id: directIdSnap.id, ...directIdSnap.data() } as InvitationDocument;
      }
    }

    if (!invitation) {
      console.info('invite.lookup.result', { reason: 'invite_not_found', token: maskTokenForLog(normalizedToken) });
      return { status: 'invalid', reason: 'invite_not_found' };
    }

    const invitationStatus = invitation.status?.toLowerCase() ?? '';

    console.info('invite.lookup.result', {
      invitationId: invitation.id,
      status: invitationStatus || 'missing',
    });

    if (isInvitationRevoked(invitationStatus) || invitation.revokedAt) {
      console.info('invite.lookup.invalid_reason', { invitationId: invitation.id, reason: 'invite_revoked' });
      return { status: 'invalid', reason: 'invite_revoked', invitation };
    }

    if (isInvitationCompleted(invitationStatus) || Boolean(invitation.acceptedAt)) {
      console.info('invite.lookup.status', { invitationId: invitation.id, reason: 'invite_already_completed' });
      return { status: 'accepted', reason: 'invite_already_completed', invitation };
    }

    if (invitationStatus === 'expired') {
      console.info('invite.lookup.status', { invitationId: invitation.id, reason: 'invite_expired' });
      return { status: 'expired', reason: 'invite_expired', invitation };
    }

    const followupReadContext = {
      invitationId: invitation.id,
      step: 'post_invite_lookup.family_read',
      path: `${firestoreCollections.families}/${invitation.familyId}`,
      operation: 'getDoc',
    } as const;
    console.info('invite.lookup.followup.marker', followupReadContext);

    if (auth.currentUser) {
      console.info('invite.lookup.followup.read.before', followupReadContext);
      try {
        const familySnapshot = await getDoc(doc(db, firestoreCollections.families, invitation.familyId));
        console.info('invite.lookup.followup.read.after', {
          ...followupReadContext,
          found: familySnapshot.exists(),
          error: null,
        });

        if (familySnapshot.exists()) {
          const family = familySnapshot.data() as FamilyDocument;
          if (family.partnerRegistered || family.partnerUserId) {
            console.info('invite.lookup.status', { invitationId: invitation.id, reason: 'invite_already_completed' });
            return { status: 'accepted', reason: 'invite_already_completed', invitation };
          }
        }
      } catch (error) {
        const firestoreError = error as { code?: string; message?: string };
        console.error('invite.lookup.followup.read.after', {
          ...followupReadContext,
          error: {
            code: firestoreError.code ?? 'unknown',
            message: firestoreError.message ?? String(error),
          },
        });
        throw error;
      }
    } else {
      console.info('invite.lookup.followup.read.skipped', {
        ...followupReadContext,
        reason: 'missing_auth_for_family_read',
      });
    }

    if (invitation.expiresAt) {
      const expiresAtTime = Date.parse(invitation.expiresAt);
      if (Number.isFinite(expiresAtTime) && expiresAtTime < Date.now()) {
        await setDoc(doc(db, firestoreCollections.invitations, invitation.id), { status: 'expired' }, { merge: true });
        console.info('invite.lookup.status', { invitationId: invitation.id, reason: 'invite_expired' });
        return { status: 'expired', reason: 'invite_expired', invitation };
      }
    }

    if (invitationStatus && invitationStatus !== 'sent') {
      console.warn('invite.lookup.invalid_reason', {
        invitationId: invitation.id,
        reason: 'premature_invalid_state',
        invitationStatus,
      });
      return { status: 'invalid', reason: 'premature_invalid_state', invitation };
    }

    console.info('invite.lookup.status', { invitationId: invitation.id, reason: 'valid' });
    return { status: 'valid', reason: null, invitation };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('invite.lookup.failed', {
      token: maskTokenForLog(normalizedToken),
      errorMessage,
      project: firebaseProjectId,
    });
    return {
      status: 'error',
      reason: 'lookup_failed',
      errorMessage,
    };
  }
}

export async function startPartnerSession(invitation: InvitationDocument) {
  const questionSetSnapshot = invitation.questionSetSnapshot?.length
    ? invitation.questionSetSnapshot
    : (invitation.questionIds?.length ? await getQuestionSnapshot(invitation.questionIds) : []);

  if (!questionSetSnapshot.length) {
    throw new Error('Der Fragenkatalog für diese Einladung konnte nicht geladen werden.');
  }

  const sessionId = doc(collection(db, firestoreCollections.quizSessions)).id;
  const payload: QuizSessionDocument = {
    id: sessionId,
    familyId: invitation.familyId,
    userId: null,
    role: 'partner',
    source: 'partner',
    questionSetId: invitation.questionSetId ?? `invite-${invitation.id}`,
    questionSetSnapshot,
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
  console.info('invite.join.start', {
    hasInvitationToken: Boolean(params.invitationToken),
    hasSessionId: Boolean(params.sessionId),
    userId: params.userId,
  });
  let response: Response;

  try {
    response = await fetch('/api/partner/finalize-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(params),
    });
  } catch {
    const error = new Error('Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.') as Error & { code?: string };
    error.code = 'partner_registration/network_failed';
    console.error('invite.join.failed', { code: error.code });
    throw error;
  }

  const payload = await response.json().catch(() => null) as { error?: string; code?: string; familyId?: string } | null;
  if (!response.ok) {
    const error = new Error(payload?.error ?? 'Partner-Registrierung konnte nicht abgeschlossen werden.') as Error & { code?: string };
    error.code = payload?.code ?? 'partner_registration/unexpected';
    console.error('invite.join.failed', { code: error.code, message: error.message });
    throw error;
  }

  console.info('invite.join.success', { familyId: payload?.familyId ?? null });
  return { familyId: payload?.familyId ?? '' };
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

async function fetchOwnResultByRole(userId: string, role: FamilyRole, familyId?: string | null) {
  const constraints = [
    where('userId', '==', userId),
    where('role', '==', role),
    limit(1),
  ];

  if (familyId) {
    constraints.splice(1, 0, where('familyId', '==', familyId));
  }

  const queryPath = familyId
    ? `${firestoreCollections.quizResults}?userId=${userId}&role=${role}&familyId=${familyId}`
    : `${firestoreCollections.quizResults}?userId=${userId}&role=${role}`;
  logSignupInfo('dashboard.followup_read.start', {
    step: 'fetchOwnResultByRole',
    path: queryPath,
    uid: userId,
  });
  let snap;
  try {
    snap = await getDocs(query(
      collection(db, firestoreCollections.quizResults),
      ...constraints,
    ));
  } catch (error) {
    logSignupError('dashboard.followup_read.failed', error, {
      step: 'fetchOwnResultByRole',
      path: queryPath,
      uid: userId,
    });
    throw error;
  }

  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as QuizResultDocument);
}

async function upsertJointResult(familyId: string, initiatorResult: QuizResultDocument, partnerResult: QuizResultDocument) {
  const jointSnap = await getDocs(query(
    collection(db, firestoreCollections.jointResults),
    where('familyId', '==', familyId),
    limit(1),
  ));
  const jointId = jointSnap.empty ? doc(collection(db, firestoreCollections.jointResults)).id : jointSnap.docs[0].id;
  const comparison = buildJointInsights(
    initiatorResult.categoryScores,
    partnerResult.categoryScores,
    initiatorResult.questionSetSnapshot[0]?.ageGroup,
  );

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
  const userResult = await getLatestInitiatorResult(userId) as (StoredUserResult & {
    filter?: { splitClarity?: string };
  }) | null;
  if (!userResult) return null;
  const profile = await fetchAppUserProfile(userId);
  if (!profile?.familyId) return null;
  const questions = userResult.questionSetSnapshot?.length
    ? userResult.questionSetSnapshot
    : await getQuestionSnapshot(userResult.questionIds);
  const categoryScores = computeCategoryScores(questions, userResult.answers);
  const totalScore = computeTotalScore(categoryScores);

  const existing = await fetchOwnResultByRole(userId, 'initiator', profile.familyId);
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

export async function ensureInitiatorFamilySetup(
  userId: string,
  options?: { inviteContextPresent?: boolean; deferResultBootstrap?: boolean },
) {
  const profile = await fetchAppUserProfile(userId);
  const inviteContextPresent = options?.inviteContextPresent ?? false;
  if (!profile || profile.role === 'partner') return null;
  const initiatorDisplayName = normalizeName(profile.displayName) || deriveNameFromEmail(profile.email);

  if (profile.familyId) {
    await buildOrUpdateInitiatorResult(userId);
    return profile.familyId;
  }

  const familyId = doc(collection(db, firestoreCollections.families)).id;
  const familyPath = `${firestoreCollections.families}/${familyId}`;

  logSignupInfo('family_doc.create.start', {
    step: 'ensureInitiatorFamilySetup',
    path: familyPath,
    uid: userId,
    inviteContextPresent,
  });

  try {
    await setDoc(doc(db, firestoreCollections.families, familyId), {
      id: familyId,
      initiatorUserId: userId,
      partnerUserId: null,
      initiatorDisplayName,
      partnerDisplayName: null,
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
    logSignupInfo('family_doc.create.success', {
      step: 'ensureInitiatorFamilySetup',
      path: familyPath,
      uid: userId,
      inviteContextPresent,
    });
  } catch (error) {
    logSignupError('family_doc.create.failed', error, {
      step: 'ensureInitiatorFamilySetup',
      path: familyPath,
      uid: userId,
      inviteContextPresent,
    });
    throw error;
  }

  const userPath = `${firestoreCollections.users}/${userId}`;
  logSignupInfo('family_link_user_doc.update.start', {
    step: 'ensureInitiatorFamilySetup',
    path: userPath,
    uid: userId,
    inviteContextPresent,
  });
  try {
    await setDoc(doc(db, firestoreCollections.users, userId), {
      familyId,
      role: 'initiator',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    logSignupInfo('family_link_user_doc.update.success', {
      step: 'ensureInitiatorFamilySetup',
      path: userPath,
      uid: userId,
      inviteContextPresent,
    });
  } catch (error) {
    logSignupError('family_link_user_doc.update.failed', error, {
      step: 'ensureInitiatorFamilySetup',
      path: userPath,
      uid: userId,
      inviteContextPresent,
    });
    throw wrapSignupFlowError({
      message: 'Nutzerprofil konnte nicht mit Familie verknüpft werden.',
      failedStep: 'ensureInitiatorFamilySetup.userLink',
      collection: firestoreCollections.users,
      path: userPath,
      cause: error,
    });
  }

  const runResultBootstrap = async () => {
    logSignupInfo('initiator_result.bootstrap.start', {
      step: 'ensureInitiatorFamilySetup',
      path: `${firestoreCollections.quizResults}`,
      uid: userId,
      inviteContextPresent,
      extra: { deferred: Boolean(options?.deferResultBootstrap) },
    });
    try {
      await buildOrUpdateInitiatorResult(userId);
      logSignupInfo('initiator_result.bootstrap.success', {
        step: 'ensureInitiatorFamilySetup',
        path: `${firestoreCollections.quizResults}`,
        uid: userId,
        inviteContextPresent,
        extra: { deferred: Boolean(options?.deferResultBootstrap) },
      });
    } catch (error) {
      logSignupError('initiator_result.bootstrap.failed', error, {
        step: 'ensureInitiatorFamilySetup',
        path: `${firestoreCollections.quizResults}`,
        uid: userId,
        inviteContextPresent,
        extra: { deferred: Boolean(options?.deferResultBootstrap) },
      });
      throw wrapSignupFlowError({
        message: 'Initiator-Ergebnis konnte nicht aufgebaut werden.',
        failedStep: 'ensureInitiatorFamilySetup.buildOrUpdateInitiatorResult',
        collection: firestoreCollections.quizResults,
        queryName: 'buildOrUpdateInitiatorResult',
        path: `${firestoreCollections.quizResults}`,
        cause: error,
      });
    }
  };

  if (options?.deferResultBootstrap) {
    void runResultBootstrap().catch(() => {
      // Fehler ist bereits geloggt; kritischer Signup-Pfad bleibt schnell.
    });
    return familyId;
  }

  await runResultBootstrap();
  return familyId;
}

export async function triggerJointPreparationByPartner(userId: string) {
  const profile = await fetchAppUserProfile(userId);
  if (!profile?.familyId || profile.role !== 'partner') throw new Error('Nur Partner können diesen Schritt auslösen.');

  const familyRef = doc(db, firestoreCollections.families, profile.familyId);
  const familySnapshot = await getDoc(familyRef);
  if (!familySnapshot.exists()) throw new Error('Familie nicht gefunden.');
  const family = familySnapshot.data() as FamilyDocument;
  return { initiatorName: family.initiatorDisplayName || 'Initiator' };
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

  try {
    const invitation = family.invitationId
      ? await getDoc(doc(db, firestoreCollections.invitations, family.invitationId)).then((snapshot) => (snapshot.exists() ? snapshot.data() as InvitationDocument : null))
      : null;
    const recipient = invitation?.partnerEmail ?? null;

    if (recipient) {
      const baseUrl = resolveAppBaseUrl();
      const loginUrl = `${baseUrl}/login`;
      await sendAppMail({
        type: 'results_unlocked_notify_partner',
        to: recipient,
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
  } catch (error) {
    console.error('results_unlocked_notify_partner.failed', {
      authUid: userId,
      familyId: family.id,
      initiatorId: family.initiatorUserId,
      partnerId: family.partnerUserId ?? null,
      resultId: jointResultId,
      collection: firestoreCollections.invitations,
      path: family.invitationId ? `${firestoreCollections.invitations}/${family.invitationId}` : null,
      errorCode: extractErrorCode(error),
      errorMessage: extractErrorMessage(error),
    });
  }

  return { alreadyActive: false };
}

export async function unlockPartnerAndJointResults(userId: string) {
  const profile = await fetchAppUserProfile(userId);
  if (!profile?.familyId) throw new Error('Keine Familie verknüpft.');

  const initiatorResultId = await buildOrUpdateInitiatorResult(userId);
  if (!initiatorResultId) throw new Error('Initiator-Ergebnis fehlt.');

  let response: Response;
  try {
    response = await fetch('/api/partner/unlock-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    });
  } catch {
    const error = new Error('Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.') as Error & { code?: string };
    error.code = 'partner_unlock/network_failed';
    throw error;
  }

  const payload = await response.json().catch(() => null) as { error?: string; code?: string; alreadyActive?: boolean } | null;
  if (!response.ok) {
    const error = new Error(payload?.error ?? 'Gemeinsame Ergebnisse konnten nicht freigeschaltet werden.') as Error & { code?: string };
    error.code = payload?.code ?? 'partner_unlock/unexpected';
    throw error;
  }

  return { alreadyActive: Boolean(payload?.alreadyActive) };
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
  logSignupInfo('fetchDashboardBundle.start', {
    step: 'fetchDashboardBundle',
    path: `${firestoreCollections.users}/${userId}`,
    uid: userId,
  });
  try {
    logSignupInfo('partner_personal_area.profile_read.start', {
      step: 'fetchDashboardBundle',
      path: `${firestoreCollections.users}/${userId}`,
      uid: userId,
    });
    let profile: AppUserProfile | null = null;
    try {
      profile = await fetchAppUserProfile(userId);
      logSignupInfo('partner_personal_area.profile_read.success', {
        step: 'fetchDashboardBundle',
        path: `${firestoreCollections.users}/${userId}`,
        uid: userId,
        extra: { profilePresent: Boolean(profile) },
      });
    } catch (error) {
      logSignupError('partner_personal_area.profile_read.failed', error, {
        step: 'fetchDashboardBundle',
        path: `${firestoreCollections.users}/${userId}`,
        uid: userId,
      });
      throw error;
    }
    if (!profile) {
      logSignupInfo('fetchDashboardBundle.success', {
        step: 'fetchDashboardBundle',
        path: `${firestoreCollections.users}/${userId}`,
        uid: userId,
        extra: { profilePresent: false },
      });
      return {
        profile: null,
        ownResult: null,
        family: null,
        joint: null,
        initiatorResult: null,
        partnerResult: null,
        initiatorDisplayName: null,
        partnerDisplayName: null,
        invitationPartnerEmail: null,
        ageGroupForOwnership: null,
        childcareTagsForOwnership: [],
      };
    }

  const familyId = profile.familyId ?? null;
  const ownRole = profile.role === 'partner' ? 'partner' : 'initiator';
  const isInitiatorContext = profile.role !== 'partner';
  const ownDisplayName = normalizeName(profile.displayName) || deriveNameFromEmail(profile.email);

  if (isInitiatorContext) {
    console.info('initiator.dashboard.load.start', {
      authUid: userId,
      familyId,
      initiatorId: userId,
      partnerId: null,
      resultId: null,
    });
  }

  let latestInitiatorResultPromise: Promise<Awaited<ReturnType<typeof getLatestInitiatorResult>> | null> | null = null;
  const getLatestInitiatorResultOnce = async () => {
    if (profile.role === 'partner') return null;
    if (!latestInitiatorResultPromise) {
      latestInitiatorResultPromise = getLatestInitiatorResult(userId);
    }
    return latestInitiatorResultPromise;
  };

  if (familyId && isInitiatorContext) {
    const familyPath = `${firestoreCollections.families}/${familyId}`;
    console.info('initiator.dashboard.first_read.start', {
      authUid: userId,
      familyId,
      initiatorId: userId,
      partnerId: null,
      resultId: null,
      collection: firestoreCollections.families,
      path: familyPath,
    });
    try {
      const firstFamilySnapshot = await getDoc(doc(db, firestoreCollections.families, familyId));
      const familyData = firstFamilySnapshot.exists() ? firstFamilySnapshot.data() as FamilyDocument : null;
      console.info('initiator.dashboard.first_read.success', {
        authUid: userId,
        familyId,
        initiatorId: familyData?.initiatorUserId ?? userId,
        partnerId: familyData?.partnerUserId ?? null,
        resultId: null,
        collection: firestoreCollections.families,
        path: familyPath,
      });
    } catch (error) {
      console.error('initiator.dashboard.first_read.failed', {
        reason: 'first_read_failed',
        authUid: userId,
        familyId,
        initiatorId: userId,
        partnerId: null,
        resultId: null,
        collection: firestoreCollections.families,
        path: familyPath,
        errorCode: extractErrorCode(error),
        errorMessage: extractErrorMessage(error),
      });
      throw error;
    }
  }

  logSignupInfo('partner_personal_area.results_read.start', {
    step: 'fetchDashboardBundle',
    path: `${firestoreCollections.quizResults}`,
    uid: userId,
    extra: { familyId, role: ownRole },
  });
  const ownResultPromise = fetchOwnResultByRole(userId, ownRole, familyId)
    .then((value) => {
      logSignupInfo('partner_personal_area.results_read.success', {
        step: 'fetchDashboardBundle',
        path: `${firestoreCollections.quizResults}`,
        uid: userId,
        extra: { ownResultPresent: Boolean(value), familyId, role: ownRole },
      });
      return value;
    })
    .catch((error) => {
      logSignupError('partner_personal_area.results_read.failed', error, {
        step: 'fetchDashboardBundle',
        path: `${firestoreCollections.quizResults}`,
        uid: userId,
        extra: { familyId, role: ownRole },
      });
      throw error;
    });

  const ownResultInitial = await ownResultPromise;
  let ownResult = ownResultInitial;
  if (ownResult && profile.role !== 'partner' && (!ownResult.stressCategories || ownResult.stressCategories.length === 0)) {
    const raw = await getLatestInitiatorResultOnce();
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
  let childcareTagsForOwnership: ChildcareTag[] = [];

  if (familyId) {
    const familyPath = `${firestoreCollections.families}/${familyId}`;
    logSignupInfo('partner_personal_area.family_read.start', {
      step: 'fetchDashboardBundle',
      path: familyPath,
      uid: userId,
      extra: { role: profile.role ?? null },
    });
    const retries = profile.role === 'partner' ? 6 : 1;
    let familyReadError: unknown = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const familySnapshot = await getDoc(doc(db, firestoreCollections.families, familyId));
        family = familySnapshot.exists() ? (familySnapshot.data() as FamilyDocument) : null;
        logSignupInfo('partner_personal_area.family_read.success', {
          step: 'fetchDashboardBundle',
          path: familyPath,
          uid: userId,
          extra: { exists: familySnapshot.exists(), attempt, retries, partnerUserId: family?.partnerUserId ?? null },
        });
        familyReadError = null;
        break;
      } catch (error) {
        familyReadError = error;
        logSignupError('partner_personal_area.family_read.failed', error, {
          step: 'fetchDashboardBundle',
          path: familyPath,
          uid: userId,
          extra: { attempt, retries, role: profile.role ?? null },
        });
        const errorCode = (error as { code?: string })?.code ?? '';
        const isPermissionDenied = errorCode === 'permission-denied' || errorCode === 'firestore/permission-denied';
        if (!isPermissionDenied || profile.role !== 'partner' || attempt >= retries) break;
        await sleep(350);
      }
    }

    if (familyReadError) {
      throw wrapSignupFlowError({
        message: 'Familie konnte noch nicht geladen werden. Partner-Verknüpfung ist wahrscheinlich noch nicht abgeschlossen.',
        failedStep: 'fetchDashboardBundle.familyRead',
        collection: firestoreCollections.families,
        path: familyPath,
        queryName: 'familyById',
        cause: familyReadError,
      });
    }
  }

  if (family) {
    const loadFamilyMemberProfile = async (targetUserId?: string | null) => {
      if (!targetUserId) return null;
      if (targetUserId === userId) return profile;
      try {
        return await fetchAppUserProfile(targetUserId);
      } catch (error) {
        const errorCode = (error as { code?: string })?.code ?? '';
        const isPermissionDenied = errorCode === 'permission-denied' || errorCode === 'firestore/permission-denied';
        if (!isPermissionDenied) throw error;
        logSignupInfo('partner_personal_area.family_profile_read.skipped_permission_denied', {
          step: 'fetchDashboardBundle',
          path: `${firestoreCollections.users}/${targetUserId}`,
          uid: userId,
          extra: { targetUserId, role: profile.role ?? null },
        });
        return null;
      }
    };

    const [initiatorProfile, partnerProfile, invitation] = await Promise.all([
      loadFamilyMemberProfile(family.initiatorUserId),
      loadFamilyMemberProfile(family.partnerUserId),
      family.invitationId
        ? getDoc(doc(db, firestoreCollections.invitations, family.invitationId)).then((snap) => (snap.exists() ? snap.data() as InvitationDocument : null))
        : Promise.resolve(null),
    ]);

    initiatorDisplayName = family.initiatorDisplayName
      || initiatorProfile?.displayName
      || (family.initiatorUserId === userId ? ownDisplayName : null)
      || deriveNameFromEmail(initiatorProfile?.email)
      || 'Initiator';
    partnerDisplayName = family.partnerDisplayName
      || partnerProfile?.displayName
      || (family.partnerUserId === userId ? ownDisplayName : null)
      || deriveNameFromEmail(partnerProfile?.email)
      || null;
    invitationPartnerEmail = invitation?.partnerEmail ?? null;
    if (!partnerDisplayName) {
      partnerDisplayName = deriveNameFromEmail(invitationPartnerEmail);
    }

    const canSeeSharedResults = Boolean(family.resultsUnlocked && family.sharedResultsOpened);
    if (canSeeSharedResults && familyId) {
      const [jointSnap, initiator, partner] = await Promise.all([
        getDocs(query(
          collection(db, firestoreCollections.jointResults),
          where('familyId', '==', familyId),
          limit(1),
        )),
        fetchResultByRole(familyId, 'initiator'),
        fetchResultByRole(familyId, 'partner'),
      ]);

      if (!jointSnap.empty) {
        joint = { id: jointSnap.docs[0].id, ...jointSnap.docs[0].data() } as JointResultDocument;
      }
      initiatorResult = initiator;
      partnerResult = partner;
    }
  }

  if (!ownResult && profile.role !== 'partner') {
    const raw = await getLatestInitiatorResultOnce();
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
  if (profile.role !== 'partner') {
    const raw = await getLatestInitiatorResultOnce();
    childcareTagsForOwnership = parseChildcareTags(raw?.filter?.childcareTags);
  }
  if (!ageGroupForOwnership && profile.role !== 'partner') {
    const raw = await getLatestInitiatorResultOnce();
    const candidate = typeof raw?.filter?.youngestAgeGroup === 'string' ? raw.filter.youngestAgeGroup : null;
    if (candidate && ['0_1', '1_3', '3_6', '6_10', '10_plus'].includes(candidate)) {
      ageGroupForOwnership = candidate as AgeGroup;
    }
  }

    const bundle = {
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
      childcareTagsForOwnership,
    };
    logSignupInfo('fetchDashboardBundle.success', {
      step: 'fetchDashboardBundle',
      path: `${firestoreCollections.users}/${userId}`,
      uid: userId,
      extra: { familyId: profile.familyId ?? null },
    });
    return bundle;
  } catch (error) {
    logSignupError('fetchDashboardBundle.failed', error, {
      step: 'fetchDashboardBundle',
      path: `${firestoreCollections.users}/${userId}`,
      uid: userId,
    });
    throw error;
  }
}

export async function persistMailDebugLog(entry: Record<string, unknown>) {
  await addDoc(collection(db, firestoreCollections.mailLogs), {
    ...entry,
    createdAt: nowIso(),
  });
}
