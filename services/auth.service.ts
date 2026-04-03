import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, type User } from 'firebase/auth';

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
