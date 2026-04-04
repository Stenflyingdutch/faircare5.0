import { firestoreCollections } from '@/types/domain';

export type MailType =
  | 'partner_invitation'
  | 'joint_result_ready_for_activation'
  | 'resend_invitation'
  | 'reminder';

interface SendMailInput {
  type: MailType;
  to: string;
  subject: string;
  html: string;
  originalRecipient: string;
  familyId?: string;
  invitationId?: string;
}

const TEST_RECIPIENT = 'pa4sten@gmail.com';

function resolveAppEnvironment() {
  const appEnv = (process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? '').toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();

  // Safety-first: only treat as production when explicitly marked as production.
  // If APP_ENV is missing/unknown, we intentionally keep mails in test-routing mode.
  if (appEnv === 'production') return 'production';
  if (appEnv === 'staging' || vercelEnv === 'preview') return 'staging';
  if (appEnv === 'test' || nodeEnv === 'test') return 'test';
  return 'development';
}

function isProduction() {
  return resolveAppEnvironment() === 'production';
}

export function resolveRecipient(email: string) {
  if (isProduction()) {
    return { actualRecipient: email, subjectPrefix: '' };
  }
  return { actualRecipient: TEST_RECIPIENT, subjectPrefix: '[TEST] ' };
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? 'FairCare <onboarding@resend.dev>';
  if (!apiKey) return { ok: false, reason: 'RESEND_API_KEY fehlt', provider: 'resend' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, reason: body.slice(0, 300), provider: 'resend' };
  }

  return { ok: true, reason: 'sent', provider: 'resend' };
}

async function sendViaSendgrid(to: string, subject: string, html: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.MAIL_FROM ?? 'noreply@faircare.local';
  if (!apiKey) return { ok: false, reason: 'SENDGRID_API_KEY fehlt', provider: 'sendgrid' };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from.includes('<') ? from.split('<')[1].replace('>', '').trim() : from },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, reason: body.slice(0, 300), provider: 'sendgrid' };
  }

  return { ok: true, reason: 'sent', provider: 'sendgrid' };
}

async function sendViaProvider(to: string, subject: string, html: string) {
  const configuredProvider = (process.env.MAIL_PROVIDER ?? '').toLowerCase();
  if (configuredProvider === 'resend') return sendViaResend(to, subject, html);
  if (configuredProvider === 'sendgrid') return sendViaSendgrid(to, subject, html);
  if (process.env.RESEND_API_KEY) return sendViaResend(to, subject, html);
  if (process.env.SENDGRID_API_KEY) return sendViaSendgrid(to, subject, html);
  return { ok: false, reason: 'Kein Mail-Provider konfiguriert (RESEND_API_KEY oder SENDGRID_API_KEY).', provider: 'none' };
}

export async function dispatchMail(input: SendMailInput) {
  console.info('[mail.dispatch] gestartet', {
    type: input.type,
    env: resolveAppEnvironment(),
    hasOriginalRecipient: Boolean(input.originalRecipient),
  });
  const resolved = resolveRecipient(input.to);
  const subject = `${resolved.subjectPrefix}${input.subject}`;
  console.info('[mail.dispatch] empfänger aufgelöst', {
    originalRecipient: input.originalRecipient,
    actualRecipient: resolved.actualRecipient,
    providerHint: (process.env.MAIL_PROVIDER ?? 'auto').toLowerCase(),
  });

  const footer = `
    <hr />
    <p style="font-size:12px;color:#666">Mail-Type: ${input.type}</p>
    <p style="font-size:12px;color:#666">Original: ${input.originalRecipient}</p>
    <p style="font-size:12px;color:#666">Tatsächlich: ${resolved.actualRecipient}</p>
    <p style="font-size:12px;color:#666">familyId: ${input.familyId ?? '-'}, invitationId: ${input.invitationId ?? '-'}</p>
  `;

  const result = await sendViaProvider(resolved.actualRecipient, subject, `${input.html}${footer}`);
  if (!result.ok) {
    console.error('[mail.dispatch] Mailversand fehlgeschlagen', {
      provider: result.provider,
      reason: result.reason,
    });
    throw new Error(`Mail provider error: ${result.reason}`);
  }
  console.info('[mail.dispatch] Mailversand erfolgreich', { provider: result.provider });

  return {
    collection: firestoreCollections.mailLogs,
    payload: {
      environment: resolveAppEnvironment(),
      type: input.type,
      originalRecipient: input.originalRecipient,
      actualRecipient: resolved.actualRecipient,
      subject,
      familyId: input.familyId ?? null,
      invitationId: input.invitationId ?? null,
      createdAt: new Date().toISOString(),
      result,
    },
    result,
  };
}
