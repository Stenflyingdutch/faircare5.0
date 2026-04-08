import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { verifyAdminSessionCookie } from '@/lib/firebase-admin';
import { PartnerFlowAdminError, unlockJointResultsWithAdmin } from '@/services/server/partner-registration.service';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const decodedToken = await verifyAdminSessionCookie(sessionCookie);

    if (!decodedToken?.uid) {
      return NextResponse.json(
        { error: 'Deine Anmeldung konnte nicht bestätigt werden. Bitte melde dich neu an.', code: 'partner_unlock/unauthorized' },
        { status: 401 },
      );
    }

    const result = await unlockJointResultsWithAdmin(decodedToken.uid);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PartnerFlowAdminError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json(
      { error: 'Gemeinsame Ergebnisse konnten nicht freigeschaltet werden.', code: 'partner_unlock/unexpected' },
      { status: 500 },
    );
  }
}
