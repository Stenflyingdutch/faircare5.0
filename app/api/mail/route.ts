import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { verifyAdminSessionCookie } from '@/lib/firebase-admin';
import { dispatchMail, MailDispatchError, type MailType } from '@/services/server/mail.service';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const decodedToken = await verifyAdminSessionCookie(sessionCookie);

    if (!decodedToken?.uid) {
      console.warn('mail.dispatch.unauthorized');
      return NextResponse.json(
        { error: 'Nicht autorisiert.', category: 'validation_error', code: 'mail_auth_unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { type, to, subject, html, originalRecipient, familyId, invitationId } = body as {
      type: MailType;
      to: string;
      subject: string;
      html: string;
      originalRecipient: string;
      familyId?: string;
      invitationId?: string;
    };

    if (!type || !to || !subject || !html) {
      return NextResponse.json(
        { error: 'Ungültiger Mail-Payload.', category: 'validation_error', code: 'mail_validation_invalid_payload' },
        { status: 400 },
      );
    }

    const outcome = await dispatchMail({ type, to, subject, html, originalRecipient: originalRecipient || to, familyId, invitationId });
    return NextResponse.json(outcome);
  } catch (error) {
    if (error instanceof MailDispatchError) {
      return NextResponse.json(
        { error: error.message, category: error.category, code: error.code, provider: error.provider ?? null },
        { status: error.status },
      );
    }

    console.error('mail.dispatch.unexpected_error', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Mail-Versand fehlgeschlagen.', category: 'server_error', code: 'mail_server_unexpected' },
      { status: 500 },
    );
  }
}
