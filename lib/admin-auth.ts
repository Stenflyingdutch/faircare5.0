import 'server-only';

import { cookies } from 'next/headers';

import { adminDb, verifyAdminSessionCookie } from '@/lib/firebase-admin';
import { isAdminProfile } from '@/services/user-profile.service';
import type { AppUserProfile } from '@/types/partner-flow';

export const SESSION_COOKIE_NAME = '__session';

export async function getAuthenticatedAdminContext() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const decodedToken = await verifyAdminSessionCookie(sessionCookie);

  if (!decodedToken?.uid) {
    return { user: null, profile: null, isAdmin: false } as const;
  }

  const profileSnapshot = await adminDb.collection('users').doc(decodedToken.uid).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() as AppUserProfile : null;
  const hasAdminClaim = decodedToken.admin === true || decodedToken.role === 'admin';
  const isAdmin = isAdminProfile(profile) || hasAdminClaim;

  return {
    user: decodedToken,
    profile,
    isAdmin,
  } as const;
}
