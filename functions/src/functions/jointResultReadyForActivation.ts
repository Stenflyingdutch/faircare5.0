import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { APP_BASE_URL, RESEND_API_KEY } from '../config/env';
import { adminDb } from '../lib/firestore';
import { sendMail } from '../services/mailService';

interface JointResultReadyData {
  jointResultId?: string;
  familyId?: string;
  initiatorEmail?: string;
}

export const jointResultReadyForActivation = onCall(
  {
    region: 'europe-west3',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: [RESEND_API_KEY],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentifizierung erforderlich.');
    }

    const data = request.data as JointResultReadyData;
    if (!data?.jointResultId || !data.familyId || !data.initiatorEmail) {
      throw new HttpsError('invalid-argument', 'jointResultId, familyId und initiatorEmail sind erforderlich.');
    }

    const familyDoc = await adminDb.collection('families').doc(data.familyId).get();
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Familie nicht gefunden.');
    }

    const family = familyDoc.data();
    if (family?.partnerUserId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Nur der verknüpfte Partner darf diese Benachrichtigung auslösen.');
    }

    const activationUrl = `${APP_BASE_URL.value().replace(/\/$/, '')}/joint-result/activate/${data.jointResultId}`;

    await sendMail({
      type: 'joint_result_ready_for_activation',
      originalRecipient: data.initiatorEmail,
      subject: 'Gemeinsames Ergebnis bereit zur Freischaltung',
      familyId: data.familyId,
      triggeredByUserId: request.auth.uid,
      html: `
        <h2>Euer gemeinsames Ergebnis ist vorbereitet</h2>
        <p>Dein Partner hat den Fragenkatalog abgeschlossen.</p>
        <p>Du kannst die gemeinsame Auswertung jetzt freischalten.</p>
        <p><a href="${activationUrl}">Gesamtergebnis freischalten</a></p>
        <p>Alternativer Link: ${activationUrl}</p>
      `,
      text: `Euer gemeinsames Ergebnis ist vorbereitet. Du kannst die gemeinsame Auswertung jetzt freischalten: ${activationUrl}`,
    });

    return { delivered: true };
  },
);
