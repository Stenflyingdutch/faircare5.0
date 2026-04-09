import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, type User } from 'firebase/auth';

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

function resolveAuthBaseUrl() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

  const explicitUrl = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitUrl) return explicitUrl.replace(/\/+$/, '');

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  if (vercelEnv === 'production' && productionDomain) {
    return `https://${productionDomain.replace(/\/+$/, '')}`;
  }

  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  }

  return 'http://localhost:3000';
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
    const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null;
    const wrapped = new Error(payload?.error ?? fallbackMessage) as Error & { code?: string };
    wrapped.code = payload?.code ?? code;
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
  console.info('auth.password_reset.request.start', { email: maskEmailForLog(normalizedEmail) });

  try {
    await postJson(
      '/api/auth/password-reset',
      { email: normalizedEmail, baseUrl: resolveAuthBaseUrl() },
      'auth/password-reset-failed',
      'Passwort-Reset konnte nicht gestartet werden. Bitte versuche es erneut.',
    );
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
    return 'Zu dieser E-Mail-Adresse gibt es kein Konto.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Zu viele Anfragen in kurzer Zeit. Bitte warte kurz und versuche es erneut.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Die Verbindung zu Firebase ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  if (code === 'auth/password-reset-config-invalid') {
    return 'Passwort-Reset ist aktuell nicht richtig konfiguriert. Bitte versuche es später erneut.';
  }

  if (code === 'auth/password-reset-delivery-failed') {
    return 'Passwort-Reset konnte aktuell nicht zugestellt werden. Bitte versuche es später erneut.';
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
