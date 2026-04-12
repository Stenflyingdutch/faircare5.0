'use client';

import { useEffect, useMemo, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { OwnershipBoard } from '@/components/ownership/OwnershipBoard';
import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import { listenToAllResponsibilities } from '@/services/responsibilities.service';
import { categoryLabelMap } from '@/services/resultCalculator';
import type { OwnershipCardDocument } from '@/types/ownership';
import type { QuizCategory } from '@/types/quiz';

export default function AdminResponsibilitiesPage() {
  const [cards, setCards] = useState<OwnershipCardDocument[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ownerOptions, setOwnerOptions] = useState<Array<{ userId: string; label: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const categoryKeys = useMemo(() => Object.keys(categoryLabelMap) as QuizCategory[], []);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setUserId(user.uid);

      try {
        const bundle = await fetchDashboardBundle(user.uid);
        const resolvedFamilyId = bundle.profile?.familyId ?? null;
        setFamilyId(resolvedFamilyId);

        if (bundle.family) {
          const nextOptions = [
            { userId: bundle.family.initiatorUserId, label: bundle.initiatorDisplayName || 'Partner 1' },
            ...(bundle.family.partnerUserId ? [{ userId: bundle.family.partnerUserId, label: bundle.partnerDisplayName || 'Partner 2' }] : []),
          ];
          setOwnerOptions(nextOptions);
        } else {
          setOwnerOptions([]);
        }
      } catch {
        setLoadError('Verantwortungsbereiche konnten nicht geladen werden.');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!familyId) return;
    const stop = listenToAllResponsibilities(
      familyId,
      (nextCards) => {
        setCards(nextCards);
        setLoadError(null);
      },
      () => setLoadError('Verantwortungsbereiche konnten nicht geladen werden.'),
    );
    return () => stop();
  }, [familyId]);

  return (
    <div className="admin-page-stack">
      <AdminPageHeader
        title="Verantwortungsbereiche"
        description="Alle Karten können hier geöffnet, bearbeitet und gelöscht werden."
      />

      {isLoading ? <p className="helper">Lade Verantwortungsbereiche…</p> : null}
      {!isLoading && (!familyId || !userId) ? (
        <p className="helper">Kein Familienkontext gefunden. Bitte zuerst als Partnerkonto einloggen.</p>
      ) : null}

      {familyId && userId ? (
        <OwnershipBoard
          familyId={familyId}
          currentUserId={userId}
          cards={cards}
          mode="dashboard"
          ownerOptions={ownerOptions}
          categoryKeys={categoryKeys}
        />
      ) : null}

      {loadError ? <p className="inline-error">{loadError}</p> : null}
    </div>
  );
}
