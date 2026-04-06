'use client';

import { useEffect, useRef } from 'react';

import { firebaseProjectId } from '@/lib/firebase';
import { observeAuthState } from '@/services/auth.service';

export function AuthSessionSync() {
  const lastSyncedUid = useRef<string | null>(null);

  useEffect(() => {
    return observeAuthState(async (user) => {
      if (!user) {
        lastSyncedUid.current = null;
        await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
        return;
      }

      if (lastSyncedUid.current === user.uid) return;

      const idToken = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-firebase-project-id': firebaseProjectId },
        credentials: 'same-origin',
        body: JSON.stringify({ idToken }),
      }).catch(() => undefined);
      lastSyncedUid.current = user.uid;
    });
  }, []);

  return null;
}
