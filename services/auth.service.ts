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
  console.info('auth.password_reset.request.start', {
    email: maskEmailForLog(normalizedEmail),
    origin: typeof window !== 'undefined' ? window.location.origin : null,
  });

  try {
    const response = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: normalizedEmail }),
    });

    const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null;
    if (!response.ok) {
      const wrapped = new Error(payload?.error ?? 'Passwort-Reset konnte nicht gestartet werden.') as Error & { code?: string };
      wrapped.code = payload?.code ?? 'password_reset/unexpected_error';
      throw wrapped;
    }

    console.info('auth.password_reset.request.success', { email: maskEmailForLog(normalizedEmail) });
  } catch (error) {
    if (isNetworkLikeError(error)) {
      const wrapped = new Error('Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.') as Error & { code?: string };
      wrapped.code = 'auth/network-request-failed';
      throw wrapped;
    }

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
    return 'Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  if (code === 'password_reset/config_error') {
    return 'Der Passwort-Reset ist aktuell technisch falsch konfiguriert. Bitte prüfe die Domain- und Mail-Einstellungen.';
  }

  if (code === 'password_reset/mail_error') {
    return 'Die Reset-E-Mail konnte gerade nicht verschickt werden. Bitte versuche es gleich noch einmal.';
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

function isPermissionDeniedCode(code?: string) {
  return code === 'permission-denied' || code === 'firestore/permission-denied';
}

export function resolvePostLoginBootstrapErrorMessage(error: unknown) {
  const errorObject = error as {
    code?: string;
    message?: string;
    failedStep?: string;
  };
  const code = errorObject?.code;
  const message = errorObject?.message?.trim();
  const failedStep = errorObject?.failedStep ?? null;

  if (code === 'auth/session-sync-failed') {
    return message || 'Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut.';
  }

  if (failedStep === 'fetchDashboardBundle.familyRead') {
    return 'Dein Login war erfolgreich, aber die zugehoerigen Familiendaten konnten nicht geladen werden. Bitte versuche es erneut.';
  }

  if (failedStep === 'ensureInitiatorFamilySetup.userLink') {
    return 'Dein Login war erfolgreich, aber dein Profil konnte nicht vollstaendig mit deiner Familie verknuepft werden. Bitte versuche es erneut.';
  }

  if (failedStep === 'ensureInitiatorFamilySetup.buildOrUpdateInitiatorResult' || failedStep === 'getLatestInitiatorResult.read') {
    return 'Dein Login war erfolgreich, aber dein Dashboard konnte noch nicht vollstaendig vorbereitet werden. Bitte versuche es erneut.';
  }

  if (isPermissionDeniedCode(code)) {
    return 'Dein Login war erfolgreich, aber auf verknuepfte Konto- oder Familiendaten konnte nicht zugegriffen werden. Bitte versuche es erneut.';
  }

  if (message && isNetworkLikeError(error)) {
    return 'Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  if (message && !code?.startsWith('auth/')) {
    return message;
  }

  return 'Dein Login war erfolgreich, aber der persoenliche Bereich konnte nicht vollstaendig geladen werden. Bitte versuche es erneut.';
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
