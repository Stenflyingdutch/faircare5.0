import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { verifyAdminSessionCookie } from '@/lib/firebase-admin';
import { UserDeleteError, executeUserDeletion } from '@/services/server/user-delete.service';

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const decodedToken = await verifyAdminSessionCookie(sessionCookie);

    if (!decodedToken?.uid) {
      return NextResponse.json(
        { error: 'Deine Anmeldung konnte nicht bestätigt werden. Bitte melde dich neu an.', code: 'user_delete/unauthorized' },
        { status: 401 },
      );
    }

    const outcome = await executeUserDeletion({
      targetUserId: decodedToken.uid,
      actorUserId: decodedToken.uid,
      actorIsAdmin: false,
      mode: 'self',
    });

    return NextResponse.json({ success: true, alreadyDeleted: outcome.alreadyDeleted });
  } catch (error) {
    if (error instanceof UserDeleteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json(
      { error: 'Dein Konto konnte nicht gelöscht werden.', code: 'user_delete/unexpected' },
      { status: 500 },
    );
  }
}
