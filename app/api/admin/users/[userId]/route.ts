import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedAdminContext } from '@/lib/admin-auth';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { UserDeleteError, executeUserDeletion } from '@/services/server/user-delete.service';
import { buildDisplayName, deriveFirstName, deriveLastName, resolveAccountStatus, resolveAdminRole, resolveSuperuserFlag } from '@/services/user-profile.service';
import type { AppUserProfile } from '@/types/partner-flow';

function usersCollection() {
  return adminDb.collection('users');
}

async function countAdmins() {
  const snapshot = await usersCollection().where('adminRole', '==', 'admin').get();
  return snapshot.size;
}

async function ensureNotLastAdmin(targetUserId: string) {
  const targetSnapshot = await usersCollection().doc(targetUserId).get();
  const targetProfile = targetSnapshot.exists ? targetSnapshot.data() as AppUserProfile : null;
  if (resolveAdminRole(targetProfile) !== 'admin') return;

  const adminCount = await countAdmins();
  if (adminCount <= 1) {
    throw new Error('Der letzte Admin kann nicht gesperrt, entmachtet oder gelöscht werden.');
  }
}

function toAdminUserResponse(userId: string, profile: AppUserProfile, authUser?: Awaited<ReturnType<typeof adminAuth.getUser>>) {
  const firstName = deriveFirstName(profile);
  const lastName = deriveLastName(profile);

  return {
    id: userId,
    email: profile.email ?? authUser?.email ?? '',
    displayName: buildDisplayName(firstName, lastName) || profile.displayName || authUser?.displayName || profile.email,
    firstName,
    lastName,
    role: profile.role ?? null,
    adminRole: resolveAdminRole(profile),
    isSuperuser: resolveSuperuserFlag(profile),
    accountStatus: resolveAccountStatus(profile),
    familyId: profile.familyId ?? null,
    createdAt: profile.createdAt ?? authUser?.metadata.creationTime ?? null,
    updatedAt: profile.updatedAt ?? null,
    lastLoginAt: profile.lastLoginAt ?? authUser?.metadata.lastSignInTime ?? null,
    authDisabled: Boolean(authUser?.disabled),
  };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const adminContext = await getAuthenticatedAdminContext();
  if (!adminContext.isAdmin) {
    return NextResponse.json({ error: 'Kein Adminzugriff.' }, { status: 403 });
  }

  const { userId } = await context.params;
  const body = await request.json() as {
    adminRole?: 'user' | 'admin';
    isSuperuser?: boolean;
    accountStatus?: 'active' | 'blocked';
  };

  const userRef = usersCollection().doc(userId);
  const snapshot = await userRef.get();
  const profile = snapshot.exists ? snapshot.data() as AppUserProfile : null;

  if (!profile) {
    return NextResponse.json({ error: 'Nutzerprofil nicht gefunden.' }, { status: 404 });
  }

  const nextAdminRole = body.adminRole ?? resolveAdminRole(profile);
  const nextIsSuperuser = body.isSuperuser ?? resolveSuperuserFlag(profile);
  const nextAccountStatus = body.accountStatus ?? resolveAccountStatus(profile);
  const needsLastAdminProtection = nextAdminRole !== 'admin' || nextAccountStatus === 'blocked';

  if (needsLastAdminProtection) {
    try {
      await ensureNotLastAdmin(userId);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 409 });
    }
  }

  await userRef.set({
    adminRole: nextAdminRole,
    isSuperuser: nextIsSuperuser,
    accountStatus: nextAccountStatus,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await adminAuth.updateUser(userId, {
    disabled: nextAccountStatus === 'blocked',
  });

  const updatedSnapshot = await userRef.get();
  const updatedProfile = updatedSnapshot.data() as AppUserProfile;
  const authUser = await adminAuth.getUser(userId).catch(() => undefined);

  return NextResponse.json({ user: toAdminUserResponse(userId, updatedProfile, authUser) });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const adminContext = await getAuthenticatedAdminContext();
  if (!adminContext.isAdmin) {
    return NextResponse.json({ error: 'Kein Adminzugriff.' }, { status: 403 });
  }

  const { userId } = await context.params;
  try {
    const outcome = await executeUserDeletion({
      targetUserId: userId,
      actorUserId: adminContext.user?.uid ?? 'admin',
      actorIsAdmin: adminContext.isAdmin,
      mode: 'admin',
    });
    return NextResponse.json({ success: true, alreadyDeleted: outcome.alreadyDeleted });
  } catch (error) {
    if (error instanceof UserDeleteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Nutzerkonto konnte nicht gelöscht werden.', code: 'user_delete/unexpected' },
      { status: 500 },
    );
  }
}
