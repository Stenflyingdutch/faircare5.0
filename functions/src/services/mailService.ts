import { logger } from 'firebase-functions';

import { getMailConfig } from '../config/env';
import { adminDb } from '../lib/firestore';

export type MailType =
  | 'partner_invitation'
  | 'joint_result_ready_for_activation'
  | 'resend_invitation'
  | 'reminder';

export interface SendMailPayload {
  type: MailType;
  originalRecipient: string;
  subject: string;
  html: string;
  text: string;
  familyId?: string;
  invitationId?: string;
  triggeredByUserId?: string;
}

interface MailProviderPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}

interface MailProvider {
  send(payload: MailProviderPayload): Promise<void>;
}

class ResendMailProvider implements MailProvider {
  constructor(private readonly apiKey: string) {}

  async send(payload: MailProviderPayload) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend send failed (${response.status}): ${body}`);
    }
  }
}

function getMailProvider(): MailProvider {
  const config = getMailConfig();

  if (config.provider !== 'resend') {
    throw new Error(`Unsupported mail provider: ${config.provider}`);
  }

  if (!config.resendApiKey) {
    throw new Error('Missing RESEND_API_KEY secret for mail provider.');
  }

  return new ResendMailProvider(config.resendApiKey);
}

export function resolveRecipient(originalRecipient: string) {
  const config = getMailConfig();
  const normalizedOriginal = originalRecipient.trim().toLowerCase();

  if (config.env === 'production') {
    return {
      originalRecipient: normalizedOriginal,
      actualRecipient: normalizedOriginal,
      isOverridden: false,
    };
  }

  return {
    originalRecipient: normalizedOriginal,
    actualRecipient: config.testEmailOverride.trim().toLowerCase(),
    isOverridden: true,
  };
}

export async function sendMail(payload: SendMailPayload) {
  const config = getMailConfig();
  const recipient = resolveRecipient(payload.originalRecipient);
  const provider = getMailProvider();

  const subject = config.env === 'production' ? payload.subject : `[TEST] ${payload.subject}`;

  await provider.send({
    to: recipient.actualRecipient,
    from: config.from,
    subject,
    html: payload.html,
    text: payload.text,
  });

  logger.info('mail.sent', {
    type: payload.type,
    originalRecipient: recipient.originalRecipient,
    actualRecipient: recipient.actualRecipient,
    familyId: payload.familyId ?? null,
    invitationId: payload.invitationId ?? null,
    triggeredByUserId: payload.triggeredByUserId ?? null,
  });

  await logMailEvent({
    type: payload.type,
    originalRecipient: recipient.originalRecipient,
    actualRecipient: recipient.actualRecipient,
    subject,
    familyId: payload.familyId,
    invitationId: payload.invitationId,
    triggeredByUserId: payload.triggeredByUserId,
  });

  return {
    subject,
    originalRecipient: recipient.originalRecipient,
    actualRecipient: recipient.actualRecipient,
  };
}

export async function logMailEvent(entry: {
  type: MailType;
  originalRecipient: string;
  actualRecipient: string;
  subject: string;
  familyId?: string;
  invitationId?: string;
  triggeredByUserId?: string;
}) {
  await adminDb.collection('mailLogs').add({
    ...entry,
    familyId: entry.familyId ?? null,
    invitationId: entry.invitationId ?? null,
    triggeredByUserId: entry.triggeredByUserId ?? null,
    createdAt: new Date().toISOString(),
  });
}
