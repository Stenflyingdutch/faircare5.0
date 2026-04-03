import { NextRequest, NextResponse } from 'next/server';

import { dispatchMail, type MailType } from '@/services/server/mail.service';

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Ungültiger Mail-Payload.' }, { status: 400 });
    }

    const outcome = await dispatchMail({ type, to, subject, html, originalRecipient: originalRecipient || to, familyId, invitationId });
    return NextResponse.json(outcome);
  } catch (error) {
    return NextResponse.json({ error: 'Mail-Versand fehlgeschlagen.', detail: String(error) }, { status: 500 });
  }
}
