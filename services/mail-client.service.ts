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
    const detail = payload?.detail ? ` (${payload.detail})` : '';
    throw new Error(`${payload?.error ?? 'Mail konnte nicht versendet werden.'}${detail}`);
  }

  await addDoc(collection(db, firestoreCollections.mailLogs), payload.payload);
  return payload;
}
