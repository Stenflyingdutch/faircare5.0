import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return '';
  return process.argv[index + 1] ?? '';
}

function requireValue(value, label) {
  if (!value) {
    throw new Error(`Missing required value: ${label}`);
  }
  return value;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeName(name) {
  return name.trim();
}

function buildDisplayName(firstName, lastName) {
  return [normalizeName(firstName), normalizeName(lastName)].filter(Boolean).join(' ').trim();
}

function resolvePrivateKey() {
  if (process.env.FIREBASE_PRIVATE_KEY) {
    return process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    return Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
  }
  return null;
}

function buildCredential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = resolvePrivateKey();

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  return applicationDefault();
}

const email = normalizeEmail(requireValue(process.env.ADMIN_USER_EMAIL || readArg('--email'), '--email'));
const password = requireValue(process.env.ADMIN_USER_PASSWORD || readArg('--password'), '--password');
const firstName = normalizeName(requireValue(process.env.ADMIN_USER_FIRST_NAME || readArg('--first-name'), '--first-name'));
const lastName = normalizeName(process.env.ADMIN_USER_LAST_NAME || readArg('--last-name') || '');
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const app = getApps()[0] ?? initializeApp({
  credential: buildCredential(),
  projectId,
});

const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  let authUser;

  try {
    authUser = await auth.getUserByEmail(email);
    authUser = await auth.updateUser(authUser.uid, {
      email,
      password,
      displayName: buildDisplayName(firstName, lastName) || firstName,
      disabled: false,
    });
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;

    authUser = await auth.createUser({
      email,
      password,
      displayName: buildDisplayName(firstName, lastName) || firstName,
      disabled: false,
    });
  }

  const userRef = db.collection('users').doc(authUser.uid);
  const existingSnapshot = await userRef.get();
  const existingData = existingSnapshot.exists ? existingSnapshot.data() : {};
  const createdAt = existingData?.createdAt || authUser.metadata.creationTime || new Date().toISOString();

  await userRef.set({
    id: authUser.uid,
    email,
    firstName,
    lastName,
    displayName: buildDisplayName(firstName, lastName) || firstName,
    adminRole: 'admin',
    accountStatus: 'active',
    createdAt,
    updatedAt: new Date().toISOString(),
    lastLoginAt: existingData?.lastLoginAt || authUser.metadata.lastSignInTime || null,
    updatedByScriptAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(JSON.stringify({
    success: true,
    uid: authUser.uid,
    email,
    existed: existingSnapshot.exists,
    adminRole: 'admin',
    accountStatus: 'active',
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
