import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { APP_BASE_URL, RESEND_API_KEY } from '../config/env';
import { adminDb } from '../lib/firestore';
import { createOrReuseInvitation, assertValidEmail } from '../services/invitationService';
import { sendMail } from '../services/mailService';

interface SendPartnerInviteData {
  partnerEmail?: string;
}

export const sendPartnerInvite = onCall(
  {
    region: 'europe-west3',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: [RESEND_API_KEY],
  },
  async (request) => {
    if (!request.auth?.uid || !request.auth.token.email) {
      throw new HttpsError('unauthenticated', 'Bitte melde dich an, um Einladungen zu versenden.');
    }

    const partnerEmail = request.data?.partnerEmail?.trim().toLowerCase();
    if (!partnerEmail) {
      throw new HttpsError('invalid-argument', 'partnerEmail fehlt.');
    }
    assertValidEmail(partnerEmail);

    const initiatorRef = adminDb.collection('users').doc(request.auth.uid);
    const initiatorDoc = await initiatorRef.get();
    if (!initiatorDoc.exists) {
      throw new HttpsError('failed-precondition', 'Dein Benutzerprofil wurde nicht gefunden.');
    }

    const invitation = await createOrReuseInvitation({
      initiatorUserId: request.auth.uid,
      initiatorEmail: request.auth.token.email,
      partnerEmail,
    });

    const baseUrl = APP_BASE_URL.value().replace(/\/$/, '');
    const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

    const mailResult = await sendMail({
      type: 'partner_invitation',
      originalRecipient: invitation.partnerEmail,
      subject: 'Partner-Einladung zum FairCare-Test',
      familyId: invitation.familyId,
      invitationId: invitation.invitationId,
      triggeredByUserId: request.auth.uid,
      html: `
        <h2>Du wurdest eingeladen, gemeinsam mit deinem Partner den FairCare-Test zu vervollständigen.</h2>
        <p>Dein Partner hat den ersten Teil bereits ausgefüllt.</p>
        <p>Du erhältst denselben Fragenkatalog und musst keine Filterfragen mehr beantworten.</p>
        <p>Danach können eure Ergebnisse gemeinsam ausgewertet werden.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#1f7aec;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">FairCare-Test starten</a></p>
        <p>Falls der Button nicht funktioniert, nutze diesen Link: ${inviteUrl}</p>
      `,
      text: `Du wurdest eingeladen, gemeinsam mit deinem Partner den FairCare-Test zu vervollständigen.\n\nDein Partner hat den ersten Teil bereits ausgefüllt. Du erhältst denselben Fragenkatalog ohne Filterfragen.\n\nStarte hier: ${inviteUrl}`,
    });

    return {
      status: 'sent' as const,
      invitationId: invitation.invitationId,
      familyId: invitation.familyId,
      partnerEmail: invitation.partnerEmail,
      originalRecipient: mailResult.originalRecipient,
      actualRecipient: mailResult.actualRecipient,
      inviteUrl,
    };
  },
);
