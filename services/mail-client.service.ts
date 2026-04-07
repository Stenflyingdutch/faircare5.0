import { addDoc, collection } from 'firebase/firestore';

import { db } from '@/lib/firebase';
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
  familyId?: string;
  invitationId?: string;
}

export class MailClientError extends Error {
  category: 'validation_error' | 'config_error' | 'provider_error' | 'server_error';
  code?: string;

  constructor(message: string, category: MailClientError['category'], code?: string) {
    super(message);
    this.category = category;
    this.code = code;
  }
}

export async function sendAppMail(input: SendMailInput) {
  const response = await fetch('/api/mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      originalRecipient: input.to,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new MailClientError(
      payload?.error ?? 'Mail konnte nicht versendet werden.',
      payload?.category ?? 'server_error',
      payload?.code,
    );
  }

  await addDoc(collection(db, firestoreCollections.mailLogs), payload.payload);
  return payload;
}
