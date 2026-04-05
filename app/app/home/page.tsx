'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { OwnershipBoard } from '@/components/ownership/OwnershipBoard';
import { observeAuthState } from '@/services/auth.service';
import { observeOwnershipCards } from '@/services/ownership.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import type { OwnershipCardDocument } from '@/types/ownership';

export default function PersonalHomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [cards, setCards] = useState<OwnershipCardDocument[]>([]);

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
    const stop = observeOwnershipCards(familyId, setCards);
    return () => stop();
  }, [familyId]);

  if (!userId || !familyId) {
    return (
      <article className="card stack">
        <h2 className="card-title">Home</h2>
        <p className="card-description">Dein Bereich wird vorbereitet …</p>
      </article>
    );
  }

  return (
    <div className="stack">
      <article className="card stack">
        <h2 className="card-title">Home</h2>
        <p className="card-description">Hier siehst du nur Karten, die dir zugeordnet sind. Du kannst sie direkt anpassen.</p>
      </article>
      <OwnershipBoard familyId={familyId} currentUserId={userId} cards={cards} mode="home" />
    </div>
  );
}
