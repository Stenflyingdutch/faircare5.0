import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseApp';
import type { UserProfile } from '@/types/user';
import { nowIso } from '@/utils/date';
import type { AuthUser } from '@/types/auth';

const usersRef = (uid: string) => doc(db, 'users', uid);

export const createUserProfile = async (profile: UserProfile) => setDoc(usersRef(profile.uid), {
  ...profile,
  createdAt: serverTimestamp(),
  lastLoginAt: serverTimestamp(),
  lastActiveAt: serverTimestamp(),
});

export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(usersRef(uid));
  return (snap.exists() ? (snap.data() as UserProfile) : null);
};

export const updateUserProfile = async (uid: string, payload: Partial<UserProfile>) => updateDoc(usersRef(uid), {
  ...payload,
  lastActiveAt: serverTimestamp(),
});

export const upsertUserProfileAfterLogin = async (authUser: AuthUser, firstName = '') => {
  const existing = await getUserProfile(authUser.uid);
  const common = {
    uid: authUser.uid,
    displayName: authUser.displayName || firstName,
    firstName: existing?.firstName || firstName,
    email: authUser.email || existing?.email || '',
    photoURL: authUser.photoURL || existing?.photoURL,
    provider: authUser.provider,
    emailVerified: authUser.emailVerified,
    locale: existing?.locale || 'en-US',
    onboardingCompleted: existing?.onboardingCompleted || false,
    quizCompleted: existing?.quizCompleted || false,
    hasSeenDetailedResults: existing?.hasSeenDetailedResults || false,
    hasSeenSharedResults: existing?.hasSeenSharedResults || false,
    notificationPreferences: existing?.notificationPreferences || { weeklyReview: true },
    lastLoginAt: nowIso(),
    lastActiveAt: nowIso(),
    createdAt: existing?.createdAt || nowIso(),
  } as UserProfile;

  await setDoc(usersRef(authUser.uid), common, { merge: true });
  return common;
};

export const markEmailVerified = async (uid: string) => updateDoc(usersRef(uid), { emailVerified: true });

export const updateLastActiveAt = async (uid: string) => updateDoc(usersRef(uid), { lastActiveAt: serverTimestamp() });
