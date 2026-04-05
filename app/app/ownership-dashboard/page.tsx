'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { OwnershipBoard } from '@/components/ownership/OwnershipBoard';
import { observeAuthState } from '@/services/auth.service';
import { observeOwnershipCards, observeOwnershipCategories } from '@/services/ownership.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import type { OwnershipCardDocument, OwnershipCategoryDocument } from '@/types/ownership';

export default function OwnershipDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [cards, setCards] = useState<OwnershipCardDocument[]>([]);
  const [categories, setCategories] = useState<OwnershipCategoryDocument[]>([]);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.uid);
      const bundle = await fetchDashboardBundle(user.uid);
      setFamilyId(bundle.profile?.familyId ?? null);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!familyId) return;
    const stopCards = observeOwnershipCards(familyId, setCards);
    const stopCategories = observeOwnershipCategories(familyId, setCategories);
    return () => {
      stopCards();
      stopCategories();
    };
  }, [familyId]);

  if (!userId || !familyId) {
    return (
      <article className="card stack">
        <h2 className="card-title">OwnershipDashboard</h2>
        <p className="card-description">Ownership-Bereich wird vorbereitet …</p>
      </article>
    );
  }

  const recommendedCount = categories.filter((item) => item.isRecommended).length;

  return (
    <div className="stack">
      <article className="card stack">
        <h2 className="card-title">OwnershipDashboard</h2>
        <p className="card-description">
          Jede Karte steht für einen klar zugeordneten Verantwortungsbereich inklusive Planung und Durchführung.
        </p>
        <p className="helper" style={{ margin: 0 }}>
          {recommendedCount > 0
            ? `${recommendedCount} Startkategorien wurden als Orientierung markiert.`
            : 'Alle aktiven Kategorien sind gleichwertig sichtbar.'}
        </p>
      </article>
      <OwnershipBoard familyId={familyId} currentUserId={userId} cards={cards} mode="dashboard" />
    </div>
  );
}
