import { NextRequest, NextResponse } from 'next/server';

import { dispatchMail, type MailType } from '@/services/server/mail.service';

export async function POST(request: NextRequest) {
  try {
    const configuredProvider = (process.env.MAIL_PROVIDER ?? 'auto').toLowerCase();
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
      console.error('[api/mail] Ungültiger Payload', {
        hasType: Boolean(type),
        hasTo: Boolean(to),
        hasSubject: Boolean(subject),
        hasHtml: Boolean(html),
      });
      return NextResponse.json({ error: 'Ungültiger Mail-Payload.' }, { status: 400 });
    }

    console.info('[api/mail] Anfrage empfangen', {
      type,
      familyId: familyId ?? null,
      invitationId: invitationId ?? null,
      configuredProvider,
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      hasSendgridKey: Boolean(process.env.SENDGRID_API_KEY),
      hasMailFrom: Boolean(process.env.MAIL_FROM),
      hasTestEmailOverride: Boolean(process.env.TEST_EMAIL_OVERRIDE),
      recipientDomain: to.includes('@') ? to.split('@')[1] : 'invalid',
    });

    const outcome = await dispatchMail({ type, to, subject, html, originalRecipient: originalRecipient || to, familyId, invitationId });
    return NextResponse.json(outcome);
  } catch (error) {
    console.error('[api/mail] Mail-Versand fehlgeschlagen', {
      message: error instanceof Error ? error.message : String(error),
      configuredProvider: (process.env.MAIL_PROVIDER ?? 'auto').toLowerCase(),
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
      hasSendgridKey: Boolean(process.env.SENDGRID_API_KEY),
      hasMailFrom: Boolean(process.env.MAIL_FROM),
    });
    return NextResponse.json({ error: 'Mail-Versand fehlgeschlagen.', detail: String(error) }, { status: 500 });
  }
}
