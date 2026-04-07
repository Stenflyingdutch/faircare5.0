import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, type User } from 'firebase/auth';

import { auth } from '@/lib/firebase';

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function registerUser(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
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
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function syncAuthSession(user: User) {
  const idToken = await user.getIdToken();
  await postJson(
    '/api/auth/session',
    { idToken },
    'auth/session-sync-failed',
    'Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut.',
  );
}

export async function signOutUser() {
  await auth.signOut();
  await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
}

export async function requestPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
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

  if (code === 'auth/session-sync-failed') {
    return message || 'Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut.';
  }

  if (code?.startsWith('partner_registration/')) {
    return message || 'Die Partner-Registrierung konnte nicht abgeschlossen werden.';
  }

  if (message && isNetworkLikeError(error)) {
    return 'Die Verbindung zum Server ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.';
  }

  return 'Registrierung fehlgeschlagen. Bitte prüfe deine Eingaben und versuche es erneut.';
}

export function resolveLoginErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Diese Kombination aus E-Mail und Passwort stimmt nicht.';
  }

  if (code === 'auth/invalid-email') {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }

  if (code === 'auth/user-disabled') {
    return 'Dein Konto ist derzeit gesperrt. Bitte kontaktiere den Support.';
  }

  return 'Login fehlgeschlagen. Bitte prüfe E-Mail und Passwort.';
}
