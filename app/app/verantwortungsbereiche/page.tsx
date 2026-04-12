'use client';

import { useEffect, useState } from 'react';

import { FamilyCategoryView } from '@/components/responsibilities/FamilyCategoryView';
import { getCurrentLocale } from '@/lib/i18n';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import type { ResponsibilityCatalogLanguage } from '@/types/responsibility-cards';

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

  const locale = getCurrentLocale();
  const language: ResponsibilityCatalogLanguage = locale === 'en' || locale === 'nl' ? locale : 'de';

  return (
    <FamilyCategoryView
      familyId={familyId}
      userId={userId}
      language="de"
    />
  );
}
