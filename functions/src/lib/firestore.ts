import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = getApps().length ? getApps()[0] : initializeApp();

export const adminApp = app;
export const adminDb = getFirestore(app);
