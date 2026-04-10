import 'server-only';

import { cookies } from 'next/headers';

import { adminDb, verifyAdminSessionCookie } from '@/lib/firebase-admin';
import { isAdminProfile } from '@/services/user-profile.service';
import type { AppUserProfile } from '@/types/partner-flow';

export const SESSION_COOKIE_NAME = '__session';

/**
 * TEMPORARY HOTFIX:
 * Alle aktuell eingeloggten Nutzer erhalten Adminzugang.
 * Kann über FAIRCARE_TEMP_ALL_USERS_ADMIN=false deaktiviert werden.
 */
const TEMP_ALL_USERS_ADMIN_ENABLED = process.env.FAIRCARE_TEMP_ALL_USERS_ADMIN !== 'false';

export async function getAuthenticatedAdminContext() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const decodedToken = await verifyAdminSessionCookie(sessionCookie);

  if (!decodedToken?.uid) {
    return { user: null, profile: null, isAdmin: false } as const;
  }

  const profileSnapshot = await adminDb.collection('users').doc(decodedToken.uid).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() as AppUserProfile : null;

  return {
    user: decodedToken,
    profile,
    isAdmin: TEMP_ALL_USERS_ADMIN_ENABLED ? true : isAdminProfile(profile),
  } as const;
}
