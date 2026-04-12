'use client';

import { useEffect, useState } from 'react';

import { FamilyCategoryView } from '@/components/responsibilities/FamilyCategoryView';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';

export default function ResponsibilityCardsPage() {
  const [familyId, setFamilyId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const bundle = await fetchDashboardBundle(user.uid);
      setFamilyId(bundle.profile?.familyId ?? '');
      setUserId(user.uid);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <p className="helper">Lade Verantwortungsbereiche…</p>;
  }

  if (!familyId || !userId) {
    return <p className="helper">Kein Familienkontext gefunden.</p>;
  }

  return (
    <FamilyCategoryView
      familyId={familyId}
      userId={userId}
      language="de"
    />
  );
}
