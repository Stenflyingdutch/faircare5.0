import { NextResponse } from 'next/server';

import { getAuthenticatedAdminContext } from '@/lib/admin-auth';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { buildDisplayName, deriveFirstName, deriveLastName, normalizeEmailAddress, resolveAccountStatus } from '@/services/user-profile.service';
import type { AppUserProfile } from '@/types/partner-flow';

type AuthUserMap = Map<string, Awaited<ReturnType<typeof adminAuth.getUser>>>;

async function listAllAuthUsers(pageToken?: string, acc: AuthUserMap = new Map()): Promise<AuthUserMap> {
  const page = await adminAuth.listUsers(1000, pageToken);
  page.users.forEach((entry) => acc.set(entry.uid, entry));
  if (page.pageToken) {
    return listAllAuthUsers(page.pageToken, acc);
  }
  return acc;
}

export async function GET() {
  const context = await getAuthenticatedAdminContext();
  if (!context.user) {
    return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
  }

  if (!context.isAdmin) {
    return NextResponse.json({ error: 'Kein Admin-Zugriff.' }, { status: 403 });
  }

  const [authUsers, profileSnapshot] = await Promise.all([
    listAllAuthUsers(),
    adminDb.collection('users').get(),
  ]);

  const profileMap = new Map(profileSnapshot.docs.map((doc) => [doc.id, doc.data() as AppUserProfile]));
  const ids = [...new Set([...authUsers.keys(), ...profileMap.keys()])];

  const users = ids.map((id) => {
    const authUser = authUsers.get(id);
    const profile = profileMap.get(id);
    const email = normalizeEmailAddress(profile?.email || authUser?.email || '');
    const firstName = deriveFirstName(profile);
    const lastName = deriveLastName(profile);
    const displayName = buildDisplayName(firstName, lastName)
      || profile?.displayName?.trim()
      || authUser?.displayName?.trim()
      || email;

    return {
      id,
      email,
      displayName,
      firstName,
      lastName,
      role: profile?.role ?? null,
      adminRole: authUser?.customClaims?.admin === true ? 'admin' : 'user',
      accountStatus: resolveAccountStatus(profile),
      familyId: profile?.familyId ?? null,
      createdAt: profile?.createdAt ?? authUser?.metadata.creationTime ?? null,
      updatedAt: profile?.updatedAt ?? null,
      lastLoginAt: profile?.lastLoginAt ?? authUser?.metadata.lastSignInTime ?? null,
      authDisabled: Boolean(authUser?.disabled),
    };
  }).sort((a, b) => a.email.localeCompare(b.email));

  return NextResponse.json({ users });
}
