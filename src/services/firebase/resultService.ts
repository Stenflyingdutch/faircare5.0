import { addDoc, collection, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseApp';
import type { IndividualResult, SharedResult } from '@/types/results';

export const saveIndividualResult = async (result: IndividualResult) => addDoc(collection(db, 'individualResults'), result);

export const saveSharedResult = async (result: SharedResult) => addDoc(collection(db, 'sharedResults'), result);

export const getIndividualResultsByUser = async (userId: string) => {
  const q = query(collection(db, 'individualResults'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as IndividualResult);
};

export const getSharedResultsByHousehold = async (householdId: string) => {
  const q = query(collection(db, 'sharedResults'), where('householdId', '==', householdId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SharedResult);
};

export const markResultsViewed = async (uid: string) => doc(db, 'users', uid);
