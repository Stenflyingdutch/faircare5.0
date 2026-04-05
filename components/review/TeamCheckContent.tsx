'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { fetchDashboardBundle } from '@/services/partnerFlow.service';
import { observeOwnershipCards } from '@/services/ownership.service';
import type { OwnershipCardDocument } from '@/types/ownership';

function resolveCardIsActive(card: OwnershipCardDocument) {
  if (typeof card.isActive === 'boolean') return card.isActive;
  return Boolean(card.ownerUserId || card.focusLevel);
}

export function TeamCheckContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchDashboardBundle>> | null>(null);
  const [cards, setCards] = useState<OwnershipCardDocument[]>([]);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setCurrentUserId(user.uid);
      const dashboard = await fetchDashboardBundle(user.uid);
      setBundle(dashboard);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!bundle?.profile?.familyId) return;
    return observeOwnershipCards(bundle.profile.familyId, setCards);
  }, [bundle?.profile?.familyId]);

  const activatedCardsCount = useMemo(() => cards.filter(resolveCardIsActive).length, [cards]);
  const showOwnershipHint = activatedCardsCount === 0;
  const canSeeJointResults = Boolean(bundle?.family?.resultsUnlocked && bundle?.family?.sharedResultsOpened);

  if (loading || !currentUserId) {
    return <section className="section"><div className="container">Lade Team-Check …</div></section>;
  }

  return (
    <section className="section">
      <div className="container stack">
        <article className="card stack">
          <h2 className="card-title">Team-Check</h2>
          <p className="card-description">Bereitet euren nächsten Team-Check vor und haltet offene Punkte fest.</p>
          <p className="helper" style={{ margin: 0 }}>Ein Team-Check hilft euch, nächste Schritte gemeinsam zu priorisieren.</p>
          <Link href="/app/ergebnisse" className="button" style={{ width: 'fit-content' }}>
            Testergebnisse ansehen
          </Link>
        </article>

        {showOwnershipHint && (
          <article className="card stack">
            <h2 className="card-title">Aufgabengebiete vorbereiten</h2>
            <p className="card-description">Aktiviert mindestens eine Karte in den Aufgabengebieten, damit ihr im Team-Check konkrete Themen habt.</p>
            <Link href="/app/ownership-dashboard" className="button primary" style={{ width: 'fit-content' }}>
              Aufgabengebiete öffnen
            </Link>
          </article>
        )}

        <article className="card stack">
          <h3 className="card-title" style={{ margin: 0 }}>Status</h3>
          {!bundle?.family && <p className="helper" style={{ margin: 0 }}>Noch keine gemeinsame Familie verknüpft.</p>}
          {!!bundle?.family && !bundle.family.partnerRegistered && (
            <p className="helper" style={{ margin: 0 }}>Partner noch nicht registriert. Sobald beide registriert sind, könnt ihr Vergleichsergebnisse gemeinsam ansehen.</p>
          )}
          {!!bundle?.family?.partnerRegistered && !canSeeJointResults && (
            <p className="helper" style={{ margin: 0 }}>Partnerergebnis ist vorhanden. Die gemeinsamen Vergleichsergebnisse werden nach Freischaltung im Bereich Ergebnisse sichtbar.</p>
          )}
          {canSeeJointResults && (
            <p className="helper" style={{ margin: 0 }}>Gemeinsame Vergleichsergebnisse sind verfügbar und im Bereich Ergebnisse jederzeit einsehbar.</p>
          )}
        </article>
      </div>
    </section>
  );
}
