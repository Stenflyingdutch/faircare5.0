import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, type User } from 'firebase/auth';

import { auth } from '@/lib/firebase';

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function registerUser(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  await auth.signOut();
}

export async function requestPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}


export function resolveRegistrationErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;

  if (code === 'auth/email-already-in-use') {
    return 'Diese E-Mail-Adresse wird bereits verwendet. Bitte melde dich an oder nutze „Passwort vergessen“.';
  }

  if (code === 'auth/invalid-email') {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }

  if (code === 'auth/weak-password') {
    return 'Bitte verwende ein stärkeres Passwort mit mindestens 6 Zeichen.';
  }

  return 'Registrierung fehlgeschlagen. Bitte prüfe deine Eingaben und versuche es erneut.';
}
