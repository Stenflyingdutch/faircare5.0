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
  console.info('[mail-client] Versand über /api/mail gestartet', {
    type: input.type,
    familyId: input.familyId ?? null,
    invitationId: input.invitationId ?? null,
    recipientDomain: input.to.includes('@') ? input.to.split('@')[1] : 'invalid',
  });
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
    console.error('[mail-client] Versand über /api/mail fehlgeschlagen', {
      status: response.status,
      error: payload?.error ?? 'unknown',
    });
    throw new Error(`${payload?.error ?? 'Mail konnte nicht versendet werden.'}${detail}`);
  }

  try {
    await addDoc(collection(db, firestoreCollections.mailLogs), payload.payload);
  } catch (logError) {
    console.warn('[mail-client] Konnte Mail-Log nicht in Firestore schreiben (non-blocking).', {
      message: logError instanceof Error ? logError.message : String(logError),
      type: input.type,
      familyId: input.familyId ?? null,
      invitationId: input.invitationId ?? null,
    });
  }
  console.info('[mail-client] Versand über /api/mail erfolgreich', {
    provider: payload?.result?.provider ?? 'unknown',
  });
  return payload;
}
