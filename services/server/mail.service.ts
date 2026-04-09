import { firestoreCollections } from '@/types/domain';

export type MailType =
  | 'partner_invitation'
  | 'joint_result_ready_for_activation'
  | 'partner_completed_notify_initiator'
  | 'results_unlocked_notify_partner'
  | 'resend_invitation'
  | 'reminder'
  | 'password_reset';

interface SendMailInput {
  type: MailType;
  to: string;
  subject: string;
  html: string;
  originalRecipient: string;
  familyId?: string;
  invitationId?: string;
}

export type MailErrorCategory = 'validation_error' | 'config_error' | 'provider_error' | 'server_error';

export class MailDispatchError extends Error {
  category: MailErrorCategory;
  code: string;
  status: number;
  provider?: string;

  constructor(message: string, options: { category: MailErrorCategory; code: string; status: number; provider?: string }) {
    super(message);
    this.category = options.category;
    this.code = options.code;
    this.status = options.status;
    this.provider = options.provider;
  }
}

const DEFAULT_MAIL_FROM = 'FairCare <noreply@mail.mental-faircare.de>';
const REQUIRED_MAIL_FROM_DOMAIN = '@mail.mental-faircare.de';

type MailRuntimeEnvironment = 'production' | 'preview' | 'development' | 'test';
type MailProvider = 'resend' | 'sendgrid' | 'noop' | 'console' | 'none';

type ResolvedMailRouting = {
  requestedRecipient: string;
  actualRecipient: string;
  subjectPrefix: string;
  overrideApplied: boolean;
  overrideRecipient: string | null;
  environment: MailRuntimeEnvironment;
};

type ValidatedMailConfig = {
  provider: MailProvider;
  from: string;
  baseUrl: string | null;
};

let cachedMailConfig: ValidatedMailConfig | null = null;
let cachedMailConfigKey = '';

function extractEmailAddress(fromValue: string) {
  if (fromValue.includes('<') && fromValue.includes('>')) {
    return fromValue.split('<')[1].replace('>', '').trim().toLowerCase();
  }
  return fromValue.trim().toLowerCase();
}

function normalizeRecipient(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function looksLikeEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function maskEmailAddress(email: string) {
  const [localPart, domainPart] = email.split('@');
  if (!localPart || !domainPart) return '***';
  if (localPart.length <= 2) return `**@${domainPart}`;
  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

function resolveAppEnvironment(): MailRuntimeEnvironment {
  const appEnv = (process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV ?? '').toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();

  if (appEnv === 'production') return 'production';
  if (appEnv === 'staging' || appEnv === 'preview' || vercelEnv === 'preview') return 'preview';
  if (vercelEnv === 'production') return 'production';
  if (appEnv === 'test' || nodeEnv === 'test') return 'test';
  return 'development';
}

export function resolveRecipient(email: string): ResolvedMailRouting {
  const requestedRecipient = normalizeRecipient(email);
  const overrideRecipient = normalizeRecipient(process.env.TEST_EMAIL_OVERRIDE);
  const environment = resolveAppEnvironment();

  if (!requestedRecipient) {
    throw new MailDispatchError('Empfängeradresse fehlt.', {
      category: 'validation_error',
      code: 'mail_validation_missing_recipient',
      status: 400,
    });
  }

  if (!looksLikeEmailAddress(requestedRecipient)) {
    throw new MailDispatchError('Empfängeradresse ist ungültig.', {
      category: 'validation_error',
      code: 'mail_validation_invalid_recipient',
      status: 400,
    });
  }

  if (environment === 'production') {
    return {
      requestedRecipient,
      actualRecipient: requestedRecipient,
      subjectPrefix: '',
      overrideApplied: false,
      overrideRecipient: null,
      environment,
    };
  }

  if (!overrideRecipient) {
    return {
      requestedRecipient,
      actualRecipient: requestedRecipient,
      subjectPrefix: '',
      overrideApplied: false,
      overrideRecipient: null,
      environment,
    };
  }

  if (!looksLikeEmailAddress(overrideRecipient)) {
    throw new MailDispatchError('TEST_EMAIL_OVERRIDE ist keine gültige E-Mail-Adresse.', {
      category: 'config_error',
      code: 'mail_config_invalid_test_override',
      status: 500,
    });
  }

  return {
    requestedRecipient,
    actualRecipient: overrideRecipient,
    subjectPrefix: '[TEST] ',
    overrideApplied: true,
    overrideRecipient,
    environment,
  };
}

function resolveConfiguredProvider(): MailProvider {
  const configuredProvider = (process.env.MAIL_PROVIDER ?? '').toLowerCase();
  if (configuredProvider === 'resend') return 'resend';
  if (configuredProvider === 'sendgrid') return 'sendgrid';
  if (configuredProvider === 'noop') return 'noop';
  if (configuredProvider === 'console') return 'console';
  if (!configuredProvider) {
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.SENDGRID_API_KEY) return 'sendgrid';
    return 'none';
  }
  return 'none';
}

function resolveAppBaseUrlForLinks() {
  const explicit = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercelEnv = (process.env.VERCEL_ENV ?? '').toLowerCase();
  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelEnv === 'production' && productionDomain) return `https://${productionDomain.replace(/\/+$/, '')}`;
  if (process.env.VERCEL_URL?.trim()) return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  return null;
}

/**
 * Validates mail configuration once per process to provide deterministic invite diagnostics.
 * Required envs:
 * - MAIL_PROVIDER (resend|sendgrid|noop)
 * - MAIL_FROM (for resend/sendgrid)
 * - RESEND_API_KEY or SENDGRID_API_KEY (provider specific)
 * Optional but recommended for invite links: APP_BASE_URL or NEXT_PUBLIC_APP_URL.
 */
export function validateMailConfig(): ValidatedMailConfig {
  const cacheKey = [
    process.env.MAIL_PROVIDER ?? '',
    process.env.MAIL_FROM ?? '',
    process.env.RESEND_API_KEY ? 'resend-key-present' : 'resend-key-missing',
    process.env.SENDGRID_API_KEY ? 'sendgrid-key-present' : 'sendgrid-key-missing',
    process.env.APP_BASE_URL ?? '',
    process.env.NEXT_PUBLIC_APP_URL ?? '',
    process.env.VERCEL_URL ?? '',
  ].join('|');

  if (cachedMailConfig && cacheKey === cachedMailConfigKey) return cachedMailConfig;

  const provider = resolveConfiguredProvider();
  const rawFrom = process.env.MAIL_FROM?.trim();
  const from = rawFrom || DEFAULT_MAIL_FROM;
  const fromEmail = extractEmailAddress(from);
  const baseUrl = resolveAppBaseUrlForLinks();

  if (provider === 'none') {
    throw new MailDispatchError(
      'MAIL_PROVIDER ist ungültig oder nicht gesetzt. Erlaubte Werte: resend, sendgrid, noop.',
      { category: 'config_error', code: 'mail_config_provider_invalid', status: 500 },
    );
  }

  if (provider === 'resend') {
    if (!process.env.RESEND_API_KEY) {
      throw new MailDispatchError('RESEND_API_KEY fehlt für MAIL_PROVIDER=resend.', {
        category: 'config_error',
        code: 'mail_config_missing_resend_key',
        status: 500,
        provider,
      });
    }
    if (!rawFrom) {
      throw new MailDispatchError('MAIL_FROM fehlt für MAIL_PROVIDER=resend.', {
        category: 'config_error',
        code: 'mail_config_missing_from',
        status: 500,
        provider,
      });
    }
    if (!fromEmail.endsWith(REQUIRED_MAIL_FROM_DOMAIN)) {
      throw new MailDispatchError(`MAIL_FROM muss auf ${REQUIRED_MAIL_FROM_DOMAIN} enden.`, {
        category: 'config_error',
        code: 'mail_config_resend_domain_invalid',
        status: 500,
        provider,
      });
    }
  }

  if (provider === 'sendgrid') {
    if (!process.env.SENDGRID_API_KEY) {
      throw new MailDispatchError('SENDGRID_API_KEY fehlt für MAIL_PROVIDER=sendgrid.', {
        category: 'config_error',
        code: 'mail_config_missing_sendgrid_key',
        status: 500,
        provider,
      });
    }
    if (!rawFrom) {
      throw new MailDispatchError('MAIL_FROM fehlt für MAIL_PROVIDER=sendgrid.', {
        category: 'config_error',
        code: 'mail_config_missing_from',
        status: 500,
        provider,
      });
    }
  }

  if (!baseUrl) {
    console.warn('[mail.dispatch] APP_BASE_URL/NEXT_PUBLIC_APP_URL fehlt; Invite-Links sollten serverseitig fallbacken.');
  }

  cachedMailConfig = { provider, from, baseUrl };
  cachedMailConfigKey = cacheKey;
  return cachedMailConfig;
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_MAIL_FROM;
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
  const config = validateMailConfig();
  const configuredProvider = config.provider;
  if (configuredProvider === 'noop' || configuredProvider === 'console') {
    console.warn('[mail.dispatch] MAIL_PROVIDER=noop aktiv – Mail wird nicht extern versendet.', {
      to: maskEmailAddress(to),
      subject,
    });
    return { ok: true, reason: 'noop', provider: 'noop' };
  }
  if (configuredProvider === 'resend') return sendViaResend(to, subject, html);
  if (configuredProvider === 'sendgrid') return sendViaSendgrid(to, subject, html);
  return {
    ok: false,
    reason: 'Kein Mail-Provider konfiguriert.',
    provider: 'none',
  };
}

export async function dispatchMail(input: SendMailInput) {
  if (!input.to || !looksLikeEmailAddress(input.to)) {
    throw new MailDispatchError('Empfängeradresse ist ungültig.', {
      category: 'validation_error',
      code: 'mail_validation_invalid_recipient',
      status: 400,
    });
  }

  if (!input.subject?.trim() || !input.html?.trim()) {
    throw new MailDispatchError('Betreff und Inhalt sind erforderlich.', {
      category: 'validation_error',
      code: 'mail_validation_missing_content',
      status: 400,
    });
  }

  const inviteLogPrefix = input.type === 'partner_invitation' ? 'mail.invite' : 'mail.dispatch';
  const runtimeEnv = resolveAppEnvironment();
  const configuredProvider = (process.env.MAIL_PROVIDER ?? 'auto').toLowerCase();
  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  const hasSendgridKey = Boolean(process.env.SENDGRID_API_KEY);
  const resolved = resolveRecipient(input.to);
  const subject = `${resolved.subjectPrefix}${input.subject}`;
  const mailDiagnostics = {
    activeProvider: configuredProvider,
    effectiveRecipient: maskEmailAddress(resolved.actualRecipient),
    usedNoopFallback: configuredProvider === 'noop' || configuredProvider === 'console',
    mailAttemptStarted: false,
    mailAttemptSucceeded: false,
    hasResendKey,
  };

  console.info(`${inviteLogPrefix}.start`, {
    type: input.type,
    env: runtimeEnv,
    hasOriginalRecipient: Boolean(input.originalRecipient),
    configuredProvider,
    hasSendgridKey,
    hasTestOverride: Boolean(process.env.TEST_EMAIL_OVERRIDE),
    overrideApplied: resolved.overrideApplied,
    ...mailDiagnostics,
  });

  console.info(`${inviteLogPrefix}.recipient_resolved`, {
    originalRecipientMasked: maskEmailAddress(resolved.requestedRecipient),
    actualRecipientMasked: maskEmailAddress(resolved.actualRecipient),
    overrideApplied: resolved.overrideApplied,
    env: resolved.environment,
  });

  const footer = `
    <hr />
    <p style="font-size:12px;color:#666">Mail-Type: ${input.type}</p>
    <p style="font-size:12px;color:#666">Original: ${resolved.requestedRecipient}</p>
    <p style="font-size:12px;color:#666">Tatsächlich: ${resolved.actualRecipient}</p>
    <p style="font-size:12px;color:#666">Override aktiv: ${resolved.overrideApplied ? 'ja' : 'nein'}</p>
    <p style="font-size:12px;color:#666">familyId: ${input.familyId ?? '-'}, invitationId: ${input.invitationId ?? '-'}</p>
  `;

  mailDiagnostics.mailAttemptStarted = true;
  let result;
  try {
    result = await sendViaProvider(resolved.actualRecipient, subject, `${input.html}${footer}`);
  } catch (error) {
    if (error instanceof MailDispatchError && error.category === 'config_error') {
      console.error(`${inviteLogPrefix}.config_error`, {
        code: error.code,
        provider: error.provider,
        message: error.message,
      });
      throw error;
    }
    throw error;
  }

  if (!result.ok) {
    console.error(`${inviteLogPrefix}.provider_error`, {
      provider: result.provider,
      reason: result.reason,
      ...mailDiagnostics,
    });
    throw new MailDispatchError('Mailversand beim Provider fehlgeschlagen.', {
      category: 'provider_error',
      code: 'mail_provider_request_failed',
      status: 502,
      provider: result.provider,
    });
  }

  mailDiagnostics.mailAttemptSucceeded = true;
  console.info(`${inviteLogPrefix}.success`, {
    provider: result.provider,
    ...mailDiagnostics,
  });

  return {
    collection: firestoreCollections.mailLogs,
    payload: {
      environment: resolved.environment,
      type: input.type,
      originalRecipient: resolved.requestedRecipient,
      actualRecipient: resolved.actualRecipient,
      overrideApplied: resolved.overrideApplied,
      overrideRecipient: resolved.overrideRecipient,
      subject,
      familyId: input.familyId ?? null,
      invitationId: input.invitationId ?? null,
      createdAt: new Date().toISOString(),
      result,
    },
    result,
  };
}
