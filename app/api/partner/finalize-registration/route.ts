import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { verifyAdminSessionCookie } from '@/lib/firebase-admin';
import { finalizePartnerRegistrationWithAdmin, PartnerRegistrationFinalizeError } from '@/services/server/partner-registration.service';
import { normalizeEmailAddress } from '@/services/user-profile.service';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const decodedToken = await verifyAdminSessionCookie(sessionCookie);

    if (!decodedToken?.uid) {
      console.error('invite.join.failed', { code: 'partner_registration/unauthorized' });
      return NextResponse.json(
        { error: 'Deine Anmeldung konnte nicht bestätigt werden. Bitte registriere dich erneut.', code: 'partner_registration/unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json() as {
      invitationToken?: string;
      sessionId?: string;
      email?: string;
      displayName?: string | null;
    };

    if (!body.invitationToken || !body.sessionId) {
      console.error('invite.join.failed', { code: 'partner_registration/invalid_payload' });
      return NextResponse.json(
        { error: 'Registrierungsdaten für den Partner fehlen.', code: 'partner_registration/invalid_payload' },
        { status: 400 },
      );
    }

    const result = await finalizePartnerRegistrationWithAdmin({
      invitationToken: body.invitationToken,
      sessionId: body.sessionId,
      userId: decodedToken.uid,
      email: normalizeEmailAddress(decodedToken.email || body.email || ''),
      displayName: body.displayName ?? decodedToken.name ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PartnerRegistrationFinalizeError) {
      console.error('invite.join.failed', { code: error.code, message: error.message });
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    console.error('partner.finalize.unexpected_error', {
      message: error instanceof Error ? error.message : String(error),
    });
    console.error('invite.join.failed', { code: 'partner_registration/unexpected' });

    return NextResponse.json(
      { error: 'Partner-Registrierung konnte nicht abgeschlossen werden.', code: 'partner_registration/unexpected' },
      { status: 500 },
    );
  }
}
