import { addDoc, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type {
  FirestoreCollectionName,
  NewsletterSubscriber,
  PublicTestResponse,
  TemplateDocument,
  UserProfile,
} from '@/types/domain';
import { firestoreCollections } from '@/types/domain';

function collectionRef(name: FirestoreCollectionName) {
  return collection(db, name);
}

export async function getTemplates() {
  const snapshot = await getDocs(collectionRef(firestoreCollections.templates));
  return snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  })) as TemplateDocument[];
}

export async function getUserProfile(userId: string) {
  const userRef = doc(db, firestoreCollections.users, userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as UserProfile;
}

export async function upsertUserProfile(user: UserProfile) {
  const userRef = doc(db, firestoreCollections.users, user.id);
  await setDoc(userRef, user, { merge: true });
}

export async function subscribeNewsletter(payload: NewsletterSubscriber) {
  return addDoc(collectionRef(firestoreCollections.newsletterSubscribers), payload);
}


export async function savePublicTestResponse(payload: PublicTestResponse) {
  return addDoc(collectionRef(firestoreCollections.publicTestResponses), payload);
}
