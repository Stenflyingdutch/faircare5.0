import 'server-only';

import fs from 'node:fs';

import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function resolvePrivateKey() {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (rawKey) return rawKey.replace(/\\n/g, '\n');

  const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  if (base64Key) {
    return Buffer.from(base64Key, 'base64').toString('utf8');
  }

  return null;
}

function buildCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = resolvePrivateKey();
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (projectId && clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };

    return cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    });
  }

  return applicationDefault();
}

const adminApp = getApps()[0] ?? initializeApp({
  credential: buildCredential(),
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

export async function verifyAdminSessionCookie(sessionCookie?: string) {
  if (!sessionCookie) return null;
  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}
