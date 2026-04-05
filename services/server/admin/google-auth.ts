import { createSign } from 'node:crypto';

interface GoogleAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

function getServiceAccountConfig() {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!clientEmail || !privateKeyRaw || !projectId) {
    throw new Error('Firebase Admin Service Account nicht vollständig konfiguriert. FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY und FIREBASE_ADMIN_PROJECT_ID sind erforderlich.');
  }

  return {
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    projectId,
  };
}

function createSignedJwt(scope: string) {
  const { clientEmail, privateKey } = getServiceAccountConfig();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const input = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(input);
  signer.end();
  const signature = signer.sign(privateKey).toString('base64url');

  return `${input}.${signature}`;
}

export function getAdminProjectId() {
  return getServiceAccountConfig().projectId;
}

export async function getGoogleAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const assertion = createSignedJwt('https://www.googleapis.com/auth/cloud-platform');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth Token konnte nicht geladen werden (${response.status}): ${text}`);
  }

  const token = (await response.json()) as GoogleAccessToken;
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };

  return token.access_token;
}
