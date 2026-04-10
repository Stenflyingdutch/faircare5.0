import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return '';
  return process.argv[index + 1] ?? '';
}

function readBoolArg(flag) {
  return process.argv.includes(flag);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function parseCsv(value) {
  return value.split(',').map((entry) => normalizeEmail(entry)).filter(Boolean);
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

const expectedProjectId = process.env.ADMIN_SYNC_EXPECTED_PROJECT_ID || readArg('--expected-project-id');
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error('Missing Firebase project id. Set FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
}

if (!expectedProjectId || projectId !== expectedProjectId) {
  throw new Error(`Refusing to run against unexpected project (${projectId}). Expected: ${expectedProjectId || 'missing'}.`);
}

const allowlistArg = process.env.ADMIN_ALLOWLIST_EMAILS || readArg('--allowlist-emails');
if (!allowlistArg) {
  throw new Error('Missing admin allowlist. Pass --allowlist-emails or ADMIN_ALLOWLIST_EMAILS.');
}

const allowlistEmails = new Set(parseCsv(allowlistArg));
if (allowlistEmails.size === 0) {
  throw new Error('Admin allowlist is empty after normalization.');
}

const dryRun = readBoolArg('--dry-run') || process.env.ADMIN_SYNC_DRY_RUN === 'true';

const app = getApps()[0] ?? initializeApp({
  credential: buildCredential(),
  projectId,
});

const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  let pageToken;
  const changes = [];

  do {
    const page = await auth.listUsers(1000, pageToken);

    for (const user of page.users) {
      const normalizedEmail = normalizeEmail(user.email || '');
      const shouldBeAdmin = normalizedEmail ? allowlistEmails.has(normalizedEmail) : false;
      const isAdmin = user.customClaims?.admin === true;
      if (shouldBeAdmin === isAdmin) continue;

      const nextClaims = { ...(user.customClaims ?? {}) };
      if (shouldBeAdmin) {
        nextClaims.admin = true;
      } else {
        delete nextClaims.admin;
      }

      changes.push({
        uid: user.uid,
        email: normalizedEmail || null,
        before: isAdmin,
        after: shouldBeAdmin,
      });

      if (!dryRun) {
        await auth.setCustomUserClaims(user.uid, Object.keys(nextClaims).length ? nextClaims : null);
        await db.collection('users').doc(user.uid).set({
          adminRole: shouldBeAdmin ? 'admin' : 'user',
          adminRoleSyncedAt: FieldValue.serverTimestamp(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    }

    pageToken = page.pageToken;
  } while (pageToken);

  console.log(JSON.stringify({
    success: true,
    projectId,
    dryRun,
    allowlistCount: allowlistEmails.size,
    changedUsers: changes.length,
    changes,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
