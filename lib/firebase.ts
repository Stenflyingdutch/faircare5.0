import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const isFirebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:000000000000:web:demo',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (!isFirebaseConfigured) {
  console.warn('Firebase ist nicht vollständig konfiguriert. Fallback-Konfiguration aktiv. Bitte .env.local prüfen.');
}

export const firebaseProjectId = firebaseConfig.projectId;
if (isFirebaseConfigured && firebaseProjectId !== 'carefair5') {
  console.warn(`Unerwartetes Firebase-Projekt aktiv: ${firebaseProjectId}`);
}

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
