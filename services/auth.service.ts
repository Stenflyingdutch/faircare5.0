import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, type User } from 'firebase/auth';

import { auth } from '@/lib/firebase';
import { logSignupError, logSignupInfo } from '@/services/signup-debug.service';

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

function maskEmailForLog(email: string) {
  const normalized = email.trim().toLowerCase();
  const [localPart, domainPart] = normalized.split('@');
  if (!localPart || !domainPart) return 'invalid';
  if (localPart.length <= 2) return `**@${domainPart}`;
  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

type AuthBaseUrlResolution = {
  baseUrl: string;
  source:
    | 'password_reset_base_url'
    | 'app_url'
    | 'app_base_url'
    | 'next_public_site_url'
    | 'next_public_app_url'
    | 'vercel_project_production_url'
    | 'vercel_project_production_url_for_preview'
    | 'vercel_url'
    | 'window_origin_local'
    | 'localhost_fallback';
  hostname: string;
  isLocalhost: boolean;
};

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

function resolveHostnameFromBaseUrl(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return 'invalid';
  }
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1';
}

function resolveAuthBaseUrl(): AuthBaseUrlResolution {
  const explicitPasswordResetBaseUrl = process.env.PASSWORD_RESET_BASE_URL?.trim();
  if (explicitPasswordResetBaseUrl) {
    const baseUrl = normalizeBaseUrl(explicitPasswordResetBaseUrl);
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    return {
      baseUrl,
      source: 'password_reset_base_url',
      hostname,
      isLocalhost: isLocalHostname(hostname),
    };
  }

  const explicitAppUrl = process.env.APP_URL?.trim();
  if (explicitAppUrl) {
    const baseUrl = normalizeBaseUrl(explicitAppUrl);
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    return {
      baseUrl,
      source: 'app_url',
      hostname,
      isLocalhost: isLocalHostname(hostname),
    };
  }

  const explicitAppBaseUrl = process.env.APP_BASE_URL?.trim();
  if (explicitAppBaseUrl) {
    const baseUrl = normalizeBaseUrl(explicitAppBaseUrl);
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    return {
      baseUrl,
      source: 'app_base_url',
      hostname,
      isLocalhost: isLocalHostname(hostname),
    };
  }

  const explicitPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitPublicSiteUrl) {
    const baseUrl = normalizeBaseUrl(explicitPublicSiteUrl);
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    return {
      baseUrl,
      source: 'next_public_site_url',
      hostname,
      isLocalhost: isLocalHostname(hostname),
    };
  }

  const explicitPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitPublicAppUrl) {
    const baseUrl = normalizeBaseUrl(explicitPublicAppUrl);
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    return {
      baseUrl,
      source: 'next_public_app_url',
      hostname,
      isLocalhost: isLocalHostname(hostname),
    };
  }

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  if (vercelEnv === 'production' && productionDomain) {
    const baseUrl = `https://${normalizeBaseUrl(productionDomain)}`;
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    return {
      baseUrl,
      source: 'vercel_project_production_url',
      hostname,
      isLocalhost: isLocalHostname(hostname),
    };
  }

  if (vercelEnv === 'preview' && productionDomain && process.env.PASSWORD_RESET_ALLOW_PREVIEW !== 'true') {
    const baseUrl = `https://${normalizeBaseUrl(productionDomain)}`;
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    return {
      baseUrl,
      source: 'vercel_project_production_url_for_preview',
      hostname,
      isLocalhost: isLocalHostname(hostname),
    };
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl && (vercelEnv !== 'preview' || process.env.PASSWORD_RESET_ALLOW_PREVIEW === 'true')) {
    const baseUrl = `https://${normalizeBaseUrl(vercelUrl)}`;
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    return {
      baseUrl,
      source: 'vercel_url',
      hostname,
      isLocalhost: isLocalHostname(hostname),
    };
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    const baseUrl = normalizeBaseUrl(window.location.origin);
    const hostname = resolveHostnameFromBaseUrl(baseUrl);
    if (isLocalHostname(hostname)) {
      return {
        baseUrl,
        source: 'window_origin_local',
        hostname,
        isLocalhost: true,
      };
    }
  }

  const baseUrl = 'http://localhost:3000';
  const hostname = resolveHostnameFromBaseUrl(baseUrl);
  return {
    baseUrl,
    source: 'localhost_fallback',
    hostname,
    isLocalhost: true,
  };
}

export async function registerUser(email: string, password: string, options?: { inviteContextPresent?: boolean }) {
  const normalizedEmail = email.trim().toLowerCase();
  const inviteContextPresent = options?.inviteContextPresent ?? false;
  logSignupInfo('auth.create_user.start', {
    step: 'registerUser',
    path: 'firebase-auth/createUserWithEmailAndPassword',
    inviteContextPresent,
    extra: { email: maskEmailForLog(normalizedEmail) },
  });

  try {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    logSignupInfo('auth.create_user.success', {
      step: 'registerUser',
      path: 'firebase-auth/createUserWithEmailAndPassword',
      inviteContextPresent,
      uid: credential.user.uid,
    });
    return credential;
  } catch (error) {
    logSignupError('auth.create_user.failed', error, {
      step: 'registerUser',
      path: 'firebase-auth/createUserWithEmailAndPassword',
      inviteContextPresent,
      extra: { email: maskEmailForLog(normalizedEmail) },
    });
    throw error;
  }
}

function isNetworkLikeError(error: unknown) {
  const code = (error as { code?: string })?.code?.toLowerCase();
  const message = (error as { message?: string })?.message?.toLowerCase() ?? '';

  return code === 'auth/network-request-failed'
    || message.includes('failed to fetch')
    || message.includes('network request failed')
    || message.includes('load failed');
}

async function postJson(url: string, body: Record<string, unknown>, code: string, fallbackMessage: string) {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = isNetworkLikeError(error)
      ? 'Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.'
      : fallbackMessage;
    const wrapped = new Error(message) as Error & { code?: string };
    wrapped.code = code;
    throw wrapped;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    const wrapped = new Error(payload?.error ?? fallbackMessage) as Error & { code?: string };
    wrapped.code = code;
    throw wrapped;
  }

  return response.json().catch(() => null);
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  console.info('auth.login.start', { email: maskEmailForLog(normalizedEmail) });

  try {
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    console.info('auth.login.success', { userId: credential.user.uid });
    return credential;
  } catch (error) {
    console.error('auth.login.failed', {
      code: (error as { code?: string })?.code ?? null,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function syncAuthSession(user: User) {
  console.info('auth.session.sync.start', { userId: user.uid });
  const idToken = await user.getIdToken();
  await postJson(
    '/api/auth/session',
    { idToken },
    'auth/session-sync-failed',
    'Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut.',
  );
  console.info('auth.session.sync.success', { userId: user.uid });
}

export async function signOutUser() {
  await auth.signOut();
  await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const baseUrlResolution = resolveAuthBaseUrl();
  const continueUrl = `${baseUrlResolution.baseUrl}/reset-password`;
  const actionCodeSettings = {
    url: continueUrl,
  };
  console.info('auth.password_reset.continue_url', {
    continueUrl,
    source: baseUrlResolution.source,
    hostname: baseUrlResolution.hostname,
    isLocalhost: baseUrlResolution.isLocalhost,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    previewResetEnabled: process.env.PASSWORD_RESET_ALLOW_PREVIEW === 'true',
  });
  console.info('auth.password_reset.request.start', { email: maskEmailForLog(normalizedEmail) });

  try {
    await sendPasswordResetEmail(auth, normalizedEmail, actionCodeSettings);
    console.info('auth.password_reset.request.success', { email: maskEmailForLog(normalizedEmail) });
  } catch (error) {
    console.error('auth.password_reset.request.failed', {
      code: (error as { code?: string })?.code ?? null,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function resolvePasswordResetErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;

  if (code === 'auth/invalid-email') {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }

  if (code === 'auth/user-not-found') {
    return 'Wenn ein Konto zu dieser E-Mail existiert, wurde eine Reset-E-Mail versendet.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Zu viele Anfragen in kurzer Zeit. Bitte warte kurz und versuche es erneut.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Die Verbindung zu Firebase ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  return 'Passwort-Reset konnte nicht gestartet werden. Bitte prüfe deine E-Mail-Adresse.';
}

export function resolveRegistrationErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message?.trim();

  if (code === 'auth/email-already-in-use') {
    return 'Diese E-Mail-Adresse wird bereits verwendet. Bitte melde dich an oder nutze „Passwort vergessen“.';
  }

  if (code === 'auth/invalid-email') {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }

  if (code === 'auth/weak-password') {
    return 'Bitte verwende ein stärkeres Passwort mit mindestens 6 Zeichen.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'E-Mail-Registrierung ist aktuell nicht aktiviert. Bitte prüfe Firebase Auth in Production.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Die Verbindung zu Firebase ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Zu viele Registrierungsversuche in kurzer Zeit. Bitte warte kurz und versuche es erneut.';
  }

  if (code === 'auth/quota-exceeded') {
    return 'Firebase Auth hat sein aktuelles Kontingent erreicht. Bitte versuche es später erneut.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'Diese Domain ist in Firebase Auth noch nicht freigeschaltet. Bitte prüfe die Authorized Domains.';
  }

  if (code === 'auth/internal-error') {
    return 'Firebase Auth hat einen internen Fehler gemeldet. Bitte versuche es erneut.';
  }

  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return 'Die Registrierung wurde technisch blockiert, bevor dein Profil vollständig gespeichert werden konnte. Bitte versuche es erneut. Falls das Problem bleibt, melde dich mit derselben E-Mail an oder nutze „Passwort vergessen“.';
  }

  if (code === 'auth/session-sync-failed') {
    return message || 'Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut.';
  }

  if (code?.startsWith('partner_registration/')) {
    return message || 'Die Partner-Registrierung konnte nicht abgeschlossen werden.';
  }

  if (code?.startsWith('auth/')) {
    return `Registrierung mit Firebase fehlgeschlagen (${code}). Bitte versuche es erneut.`;
  }

  if (message && isNetworkLikeError(error)) {
    return 'Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  return 'Registrierung fehlgeschlagen. Bitte prüfe deine Eingaben und versuche es erneut.';
}

export function resolveLoginErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message?.trim();

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Diese Kombination aus E-Mail und Passwort stimmt nicht.';
  }

  if (code === 'auth/invalid-email') {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }

  if (code === 'auth/user-disabled') {
    return 'Dein Konto ist derzeit gesperrt. Bitte kontaktiere den Support.';
  }

  if (code === 'auth/session-sync-failed') {
    return message || 'Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Die Verbindung zu Firebase ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  if (code?.startsWith('partner_registration/')) {
    return message || 'Die Partner-Registrierung konnte nicht abgeschlossen werden.';
  }

  if (message && isNetworkLikeError(error)) {
    return 'Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  return 'Login fehlgeschlagen. Bitte prüfe E-Mail und Passwort.';
}
