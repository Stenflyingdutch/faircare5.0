import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

import { functions } from '@/lib/firebase';

export interface SendPartnerInviteResult {
  invitationId: string;
  familyId: string;
  partnerEmail: string;
  originalRecipient: string;
  actualRecipient: string;
  inviteUrl: string;
  status: 'sent' | 'already_sent';
}

interface SendPartnerInvitePayload {
  partnerEmail: string;
}

interface JointResultReadyPayload {
  jointResultId: string;
  familyId: string;
  initiatorEmail: string;
}

function mapFunctionsError(error: unknown, fallback: string) {
  if (error instanceof FirebaseError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export async function sendPartnerInvite(partnerEmail: string) {
  const callable = httpsCallable<SendPartnerInvitePayload, SendPartnerInviteResult>(functions, 'sendPartnerInvite');

  try {
    const response = await callable({ partnerEmail });
    return response.data;
  } catch (error) {
    throw new Error(mapFunctionsError(error, 'Einladung konnte nicht versendet werden.'));
  }
}

export async function sendJointResultReadyForActivationMail(input: JointResultReadyPayload) {
  const callable = httpsCallable<JointResultReadyPayload, { delivered: boolean }>(functions, 'jointResultReadyForActivation');

  try {
    const response = await callable(input);
    return response.data;
  } catch (error) {
    throw new Error(mapFunctionsError(error, 'Status-Mail konnte nicht versendet werden.'));
  }
}
