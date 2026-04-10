import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { adminCmsSeed } from '@/data/adminCmsSeed';
import { db } from '@/lib/firebase';
import { firestoreCollections } from '@/types/domain';
import type { AdminCmsState } from '@/types/admin-cms';

const ADMIN_CMS_DOC_ID = 'admin-cms-v1';

function cloneState(state: AdminCmsState): AdminCmsState {
  return JSON.parse(JSON.stringify(state)) as AdminCmsState;
}

export async function fetchAdminCmsState(): Promise<AdminCmsState> {
  if (typeof window !== 'undefined') {
    const localRaw = window.localStorage.getItem(ADMIN_CMS_DOC_ID);
    if (localRaw) {
      try {
        return JSON.parse(localRaw) as AdminCmsState;
      } catch {
        // ignore invalid local cache
      }
    }
  }

  try {
    const snapshot = await getDoc(doc(db, firestoreCollections.templates, ADMIN_CMS_DOC_ID));
    if (snapshot.exists()) {
      const payload = snapshot.data() as { content?: AdminCmsState };
      if (payload.content) {
        return payload.content;
      }
    }
  } catch {
    // offline fallback
  }

  return cloneState(adminCmsSeed);
}

export async function persistAdminCmsState(nextState: AdminCmsState) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ADMIN_CMS_DOC_ID, JSON.stringify(nextState));
  }

  await setDoc(doc(db, firestoreCollections.templates, ADMIN_CMS_DOC_ID), {
    id: ADMIN_CMS_DOC_ID,
    category: 'pageContent',
    name: 'FairCare Admin CMS',
    version: 1,
    isActive: true,
    updatedAt: serverTimestamp(),
    content: nextState,
  }, { merge: true });
}
