import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

function uniqueUserIds(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0))];
}

function resolveExpectedVisibleToUserIds(task, family) {
  return uniqueUserIds([
    ...(task.visibleToUserIds ?? []),
    task.creatorUserId ?? task.createdByUserId,
    task.delegatedToUserId ?? null,
    family.initiatorUserId,
    family.partnerUserId ?? null,
  ]);
}

function hasSameMembers(left, right) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((entry) => rightSet.has(entry));
}

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const app = getApps()[0] ?? initializeApp({
    credential: buildCredential(),
    projectId,
  });
  const db = getFirestore(app);

  const familiesSnapshot = await db.collection('families').get();
  let familiesTouched = 0;
  let tasksUpdated = 0;

  for (const familyDoc of familiesSnapshot.docs) {
    const family = familyDoc.data();
    const tasksSnapshot = await familyDoc.ref.collection('tasks').get();
    if (tasksSnapshot.empty) continue;

    const batch = db.batch();
    let familyUpdates = 0;
    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const expected = resolveExpectedVisibleToUserIds(task, family);
      if (!hasSameMembers(task.visibleToUserIds ?? [], expected)) {
        familyUpdates += 1;
        tasksUpdated += 1;
        batch.set(taskDoc.ref, {
          visibleToUserIds: expected,
          updatedAt: new Date().toISOString(),
          visibilityRepairAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    if (familyUpdates > 0) {
      await batch.commit();
      familiesTouched += 1;
    }
  }

  console.log(JSON.stringify({
    success: true,
    familiesScanned: familiesSnapshot.size,
    familiesTouched,
    tasksUpdated,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
