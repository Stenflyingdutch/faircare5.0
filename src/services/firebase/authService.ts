import {
  createUserWithEmailAndPassword,
  OAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { auth } from './firebaseApp';
import type { AuthUser } from '@/types/auth';

const mapUser = (u: User): AuthUser => ({
  uid: u.uid,
  email: u.email,
  displayName: u.displayName,
  photoURL: u.photoURL,
  provider: (u.providerData[0]?.providerId as AuthUser['provider']) || 'password',
  emailVerified: u.emailVerified,
});

export const signUpWithEmail = async (email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  return mapUser(cred.user);
};

export const loginWithEmail = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return mapUser(cred.user);
};

export const sendVerificationEmail = async () => {
  if (!auth.currentUser) throw new Error('auth/no-current-user');
  return sendEmailVerification(auth.currentUser);
};

export const reloadCurrentUser = async () => {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return mapUser(auth.currentUser);
};

export const loginWithGoogle = async () => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });
  if (!request) throw new Error('auth/google-not-ready');
  const result = response?.type === 'success' ? response : await promptAsync();
  if (result.type !== 'success') throw new Error('auth/google-cancelled');
  const idToken = result.params.id_token;
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  return mapUser(cred.user);
};

export const loginWithApple = async () => {
  const appleCred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCred.identityToken || undefined,
  });
  const cred = await signInWithCredential(auth, credential);
  return {
    authUser: mapUser(cred.user),
    appleProfile: {
      firstName: appleCred.fullName?.givenName || '',
      email: appleCred.email || cred.user.email || '',
    },
  };
};

export const logout = () => signOut(auth);
export const getCurrentAuthUser = () => (auth.currentUser ? mapUser(auth.currentUser) : null);
export const onAuthStateChanged = (cb: (user: AuthUser | null) => void) => firebaseOnAuthStateChanged(auth, (user) => cb(user ? mapUser(user) : null));
