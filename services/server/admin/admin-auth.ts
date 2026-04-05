import { decodeFirestoreValue, getDocument } from '@/services/server/admin/firestore-rest';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export interface AdminRequester {
  uid: string;
  email?: string;
}

export async function verifyRequester(authHeader?: string | null): Promise<AdminRequester> {
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY fehlt für Token-Validierung.');
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    throw new Error('Nicht authentifiziert.');
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });

  if (!response.ok) {
    throw new Error('Ungültiges Auth-Token.');
  }

  const payload = await response.json() as { users?: Array<{ localId: string; email?: string }> };
  const user = payload.users?.[0];

  if (!user?.localId) {
    throw new Error('Token konnte nicht einem Nutzer zugeordnet werden.');
  }

  return {
    uid: user.localId,
    email: user.email,
  };
}

export async function requireAdmin(authHeader?: string | null) {
  const requester = await verifyRequester(authHeader);
  const requesterDoc = await getDocument(`users/${requester.uid}`, ['role']);
  const role = decodeFirestoreValue(requesterDoc?.fields?.role);

  if (role !== 'admin') {
    throw new Error('Nur Admins dürfen diese Aktion ausführen.');
  }

  return requester;
}
