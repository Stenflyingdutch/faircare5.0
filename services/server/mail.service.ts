import { firestoreCollections } from '@/types/domain';

export type MailType =
  | 'partner_invitation'
  | 'joint_result_ready_for_activation'
  | 'partner_completed_notify_initiator'
  | 'results_unlocked_notify_partner'
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

const DEFAULT_TEST_RECIPIENT = 'pa4sten@gmail.com';
const DEFAULT_MAIL_FROM = 'FairCare <noreply@mail.mental-faircare.de>';
const REQUIRED_MAIL_FROM_DOMAIN = '@mail.mental-faircare.de';

function extractEmailAddress(fromValue: string) {
  if (fromValue.includes('<') && fromValue.includes('>')) {
    return fromValue.split('<')[1].replace('>', '').trim().toLowerCase();
  }
  return fromValue.trim().toLowerCase();
}

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
  const overrideRecipient = process.env.TEST_EMAIL_OVERRIDE?.trim() || DEFAULT_TEST_RECIPIENT;
  if (isProduction()) {
    return { actualRecipient: email, subjectPrefix: '' };
  }
  return { actualRecipient: overrideRecipient, subjectPrefix: '[TEST] ' };
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const configuredProvider = (process.env.MAIL_PROVIDER ?? '').toLowerCase();
  const rawFrom = process.env.MAIL_FROM?.trim();
  const env = resolveAppEnvironment();
  let from = rawFrom || DEFAULT_MAIL_FROM;
  if (!apiKey) return { ok: false, reason: 'RESEND_API_KEY fehlt', provider: 'resend' };
  if (configuredProvider === 'resend') {
    if (!rawFrom) {
      if (env !== 'production') {
        console.warn('[mail.dispatch] MAIL_FROM fehlt für Resend, verwende DEFAULT_MAIL_FROM in non-production.', {
          env,
          fallbackFrom: DEFAULT_MAIL_FROM,
        });
        from = DEFAULT_MAIL_FROM;
      } else {
        return {
          ok: false,
          reason: `MAIL_FROM fehlt. Für MAIL_PROVIDER=resend muss MAIL_FROM gesetzt sein (Domain ${REQUIRED_MAIL_FROM_DOMAIN}).`,
          provider: 'resend',
        };
      }
    }
    const fromEmail = extractEmailAddress(from);
    if (!fromEmail.endsWith(REQUIRED_MAIL_FROM_DOMAIN)) {
      if (env !== 'production') {
        console.warn('[mail.dispatch] MAIL_FROM Domain ungültig für Resend, verwende DEFAULT_MAIL_FROM in non-production.', {
          env,
          configuredFrom: fromEmail,
          fallbackFrom: DEFAULT_MAIL_FROM,
        });
        from = DEFAULT_MAIL_FROM;
      } else {
        return {
          ok: false,
          reason: `MAIL_FROM muss auf ${REQUIRED_MAIL_FROM_DOMAIN} enden. Aktuell: ${fromEmail}`,
          provider: 'resend',
        };
      }
    }
  }
  if (configuredProvider !== 'resend' && rawFrom) {
    const fromEmail = extractEmailAddress(rawFrom);
    if (!fromEmail.endsWith(REQUIRED_MAIL_FROM_DOMAIN) && env !== 'production') {
      console.warn('[mail.dispatch] MAIL_FROM ist nicht auf neuer Domain, nutze DEFAULT_MAIL_FROM in non-production.', {
        env,
        configuredFrom: fromEmail,
        fallbackFrom: DEFAULT_MAIL_FROM,
      });
      from = DEFAULT_MAIL_FROM;
    }
  }

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
  const from = process.env.MAIL_FROM ?? DEFAULT_MAIL_FROM;
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
  if (configuredProvider === 'noop' || configuredProvider === 'console') {
    console.warn('[mail.dispatch] MAIL_PROVIDER=noop aktiv – Mail wird nicht extern versendet.', {
      to,
      subject,
    });
    return { ok: true, reason: 'noop', provider: 'noop' };
  }
  if (configuredProvider === 'resend') return sendViaResend(to, subject, html);
  if (configuredProvider === 'sendgrid') return sendViaSendgrid(to, subject, html);
  if (process.env.RESEND_API_KEY) return sendViaResend(to, subject, html);
  if (process.env.SENDGRID_API_KEY) return sendViaSendgrid(to, subject, html);
  return {
    ok: false,
    reason: 'Kein Mail-Provider konfiguriert. Setze MAIL_PROVIDER=resend mit RESEND_API_KEY oder MAIL_PROVIDER=sendgrid mit SENDGRID_API_KEY. Für lokale Smoke-Tests optional MAIL_PROVIDER=noop.',
    provider: 'none',
  };
}

export async function dispatchMail(input: SendMailInput) {
  const runtimeEnv = resolveAppEnvironment();
  const configuredProvider = (process.env.MAIL_PROVIDER ?? 'auto').toLowerCase();
  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  const hasSendgridKey = Boolean(process.env.SENDGRID_API_KEY);
  const resolved = resolveRecipient(input.to);
  const subject = `${resolved.subjectPrefix}${input.subject}`;
  const mailDiagnostics = {
    activeProvider: configuredProvider,
    effectiveRecipient: resolved.actualRecipient,
    usedNoopFallback: configuredProvider === 'noop' || configuredProvider === 'console',
    mailAttemptStarted: false,
    mailAttemptSucceeded: false,
    hasResendKey,
  };
  console.info('[mail.dispatch] gestartet', {
    type: input.type,
    env: runtimeEnv,
    hasOriginalRecipient: Boolean(input.originalRecipient),
    configuredProvider,
    hasSendgridKey,
    hasTestOverride: Boolean(process.env.TEST_EMAIL_OVERRIDE),
    ...mailDiagnostics,
  });
  console.info('[mail.dispatch] empfänger aufgelöst', {
    originalRecipient: input.originalRecipient,
    actualRecipient: resolved.actualRecipient,
    providerHint: configuredProvider,
  });

  const footer = `
    <hr />
    <p style="font-size:12px;color:#666">Mail-Type: ${input.type}</p>
    <p style="font-size:12px;color:#666">Original: ${input.originalRecipient}</p>
    <p style="font-size:12px;color:#666">Tatsächlich: ${resolved.actualRecipient}</p>
    <p style="font-size:12px;color:#666">familyId: ${input.familyId ?? '-'}, invitationId: ${input.invitationId ?? '-'}</p>
  `;

  mailDiagnostics.mailAttemptStarted = true;
  const result = await sendViaProvider(resolved.actualRecipient, subject, `${input.html}${footer}`);
  if (!result.ok) {
    console.error('[mail.dispatch] Mailversand fehlgeschlagen', {
      provider: result.provider,
      reason: result.reason,
      ...mailDiagnostics,
    });
    throw new Error(`Mail provider error: ${result.reason}`);
  }
  mailDiagnostics.mailAttemptSucceeded = true;
  console.info('[mail.dispatch] Mailversand abgeschlossen', {
    provider: result.provider,
    ...mailDiagnostics,
  });

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
