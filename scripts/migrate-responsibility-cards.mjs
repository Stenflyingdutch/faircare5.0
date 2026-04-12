import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function resolvePrivateKey() {
  if (process.env.FIREBASE_PRIVATE_KEY) return process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (process.env.FIREBASE_PRIVATE_KEY_BASE64) return Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
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

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const dryRun = process.argv.includes('--dry-run');
const app = getApps()[0] ?? initializeApp({ credential: buildCredential(), projectId });
const db = getFirestore(app);

function inferSourceType(data) {
  if (typeof data.sourceCatalogCardId === 'string' && data.sourceCatalogCardId.trim()) {
    return 'catalog';
  }
  return 'custom';
}

async function migrateFamilyCards() {
  const familiesSnapshot = await db.collection('families').get();

  let familiesProcessed = 0;
  let cardsMigrated = 0;

  for (const familyDoc of familiesSnapshot.docs) {
    const familyId = familyDoc.id;
    const legacyCardsSnapshot = await db.collection('families').doc(familyId).collection('ownershipCards').get();
    if (legacyCardsSnapshot.empty) {
      familiesProcessed += 1;
      continue;
    }

    const batch = db.batch();

    legacyCardsSnapshot.docs.forEach((legacyCard) => {
      const data = legacyCard.data();
      const targetRef = db.collection('families').doc(familyId).collection('responsibility_cards').doc(legacyCard.id);

      const nextDoc = {
        familyId,
        categoryKey: data.categoryKey ?? 'unknown',
        title: data.title ?? '',
        description: data.note ?? data.description ?? '',
        sourceType: inferSourceType(data),
        sourceCatalogCardId: data.sourceCatalogCardId ?? null,
        importedAt: data.importedAt ?? null,
        createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: data.createdBy ?? data.updatedBy ?? 'migration-script',
        updatedBy: 'migration-script',
        assigneeUserId: data.ownerUserId ?? null,
        status: data.isDone === true ? 'done' : 'open',
        focusState: data.focusLevel ?? null,
        isArchived: data.isDeleted === true,
        delegationState: data.delegationState ?? null,
        lastMessageAt: data.lastMessageAt ?? null,
        messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
      };

      batch.set(targetRef, nextDoc, { merge: true });
      cardsMigrated += 1;
    });

    if (!dryRun) {
      await batch.commit();
    }

    familiesProcessed += 1;
  }

  return { familiesProcessed, cardsMigrated };
}

async function migrateGlobalCards() {
  const legacyGlobalSnapshot = await db.collection('ownershipCards').get();
  let globalCardsSeen = 0;

  for (const cardDoc of legacyGlobalSnapshot.docs) {
    const data = cardDoc.data();
    const familyId = data.familyId;

    if (typeof familyId !== 'string' || !familyId) {
      continue;
    }

    const targetRef = db.collection('families').doc(familyId).collection('responsibility_cards').doc(cardDoc.id);
    const nextDoc = {
      familyId,
      categoryKey: data.categoryKey ?? 'unknown',
      title: data.title ?? '',
      description: data.note ?? data.description ?? '',
      sourceType: inferSourceType(data),
      sourceCatalogCardId: data.sourceCatalogCardId ?? null,
      importedAt: data.importedAt ?? null,
      createdAt: data.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: data.createdBy ?? data.updatedBy ?? 'migration-script',
      updatedBy: 'migration-script',
      assigneeUserId: data.ownerUserId ?? null,
      status: data.isDone === true ? 'done' : 'open',
      focusState: data.focusLevel ?? null,
      isArchived: data.isDeleted === true,
      delegationState: data.delegationState ?? null,
      lastMessageAt: data.lastMessageAt ?? null,
      messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
    };

    if (!dryRun) {
      await targetRef.set(nextDoc, { merge: true });
    }
    globalCardsSeen += 1;
  }

  return { globalCardsSeen };
}

async function main() {
  const familyMigration = await migrateFamilyCards();
  const globalMigration = await migrateGlobalCards();

  console.log(JSON.stringify({
    success: true,
    dryRun,
    ...familyMigration,
    ...globalMigration,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
