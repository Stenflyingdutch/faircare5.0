import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, type User } from 'firebase/auth';

import { auth } from '@/lib/firebase';

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function registerUser(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function syncAuthSession(user: User) {
  const idToken = await user.getIdToken();
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    const error = new Error(payload?.error ?? 'Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut.') as Error & { code?: string };
    error.code = 'auth/session-sync-failed';
    throw error;
  }
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

  if (code === 'auth/session-sync-failed') {
    return message || 'Deine Anmeldung konnte nicht bestätigt werden. Bitte versuche es erneut.';
  }

  if (code?.startsWith('partner_registration/')) {
    return message || 'Die Partner-Registrierung konnte nicht abgeschlossen werden.';
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
