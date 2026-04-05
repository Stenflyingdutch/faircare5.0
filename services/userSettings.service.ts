import {
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { firestoreCollections } from '@/types/domain';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string) {
  return value.trim();
}

export async function updatePersonalSettings(params: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  currentEmail: string;
  newPassword?: string;
  currentPassword?: string;
}) {
  const user = auth.currentUser;
  if (!user || user.uid !== params.userId) {
    throw new Error('not-authenticated');
  }

  const normalizedFirstName = normalizeName(params.firstName);
  const normalizedLastName = normalizeName(params.lastName);
  const normalizedEmail = normalizeEmail(params.email);
  const normalizedCurrentEmail = normalizeEmail(params.currentEmail);
  const displayName = `${normalizedFirstName} ${normalizedLastName}`.trim();

  if (normalizedEmail !== normalizedCurrentEmail) {
    const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
    if (signInMethods.length > 0) {
      throw new Error('email-already-in-use');
    }
    await updateEmail(user, normalizedEmail);
  }

  if (displayName && user.displayName !== displayName) {
    await updateProfile(user, { displayName });
  }

  if (params.newPassword?.trim()) {
    await updatePassword(user, params.newPassword.trim());
  }

  await setDoc(doc(db, firestoreCollections.users, params.userId), {
    email: normalizedEmail,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    displayName,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function reauthenticateForPersonalSettings(params: {
  email: string;
  currentPassword: string;
}) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('not-authenticated');
  }
  const credential = EmailAuthProvider.credential(params.email, params.currentPassword);
  await reauthenticateWithCredential(user, credential);
}

export function resolvePersonalSettingsError(error: unknown) {
  const code = (error as { code?: string; message?: string })?.code || (error as { message?: string })?.message;

  if (code === 'auth/invalid-email') return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  if (code === 'auth/email-already-in-use' || code === 'email-already-in-use') {
    return 'Diese E-Mail-Adresse ist bereits vergeben. Bitte verwende eine andere E-Mail-Adresse.';
  }
  if (code === 'auth/weak-password') return 'Bitte verwende ein stärkeres Passwort mit mindestens 6 Zeichen.';
  if (code === 'auth/requires-recent-login') {
    return 'Bitte bestätige zur Sicherheit dein aktuelles Passwort und speichere erneut.';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Das aktuelle Passwort ist nicht korrekt. Bitte prüfe deine Eingabe.';
  }
  if (code === 'not-authenticated') return 'Du bist nicht angemeldet. Bitte melde dich erneut an.';

  return 'Die Einstellungen konnten nicht gespeichert werden. Bitte versuche es erneut.';
}
