'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { stressOptions } from '@/components/test/test-config';
import { completePartnerSession, savePartnerStressSelection } from '@/services/partnerFlow.service';
import { loadPartnerLocalSession, savePartnerLocalSession, type PartnerLocalSession } from '@/services/partnerSessionStorage';
import type { StressSelection } from '@/types/quiz';

const stressCategoryDescriptions: Record<StressSelection, string> = {
  betreuung_entwicklung: 'Schlaf, Entwicklung und Begleitung im Alltag des Babys.',
  gesundheit: 'Vorsorge, Symptome, Medikamente und gesundheitliche Entscheidungen.',
  babyalltag_pflege: 'Essen, Wickeln, Baden, Kleidung und tägliche Pflege.',
  haushalt_einkaeufe_vorraete: 'Einkäufe, Vorräte, Wäsche und laufende Besorgungen.',
  termine_planung_absprachen: 'Kalender, Organisation, Absprachen und Zuständigkeiten.',
  keiner_genannten_bereiche: 'Aktuell empfinde ich in keinem der genannten Bereiche die größte Belastung.',
};

export default function PartnerStressPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [session, setSession] = useState<PartnerLocalSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params?.token;
    const stored = loadPartnerLocalSession();
    if (!token || !stored || stored.invitationToken !== token) {
      router.replace(`/invite/${token}`);
      return;
    }
    setSession(stored);
  }, [params?.token, router]);

  async function selectCategory(category: StressSelection) {
    if (!session || isSaving) return;
    setIsSaving(true);
    setError(null);

    const stressCategories = category === 'keiner_genannten_bereiche' ? [] : [category];
    const updated = { ...session, stressSelection: category };
    setSession(updated);
    savePartnerLocalSession(updated);

    try {
      await savePartnerStressSelection(session.sessionId, category);
      const completed = await completePartnerSession(session.sessionId, session.answers, stressCategories);
      savePartnerLocalSession({ ...updated, completedAt: completed.resultDraft.completedAt });
      router.push(`/register-after-test?token=${session.invitationToken}`);
    } catch {
      setError('Der Partner-Test konnte nicht final gespeichert werden. Bitte erneut versuchen.');
      setIsSaving(false);
    }
  }

  if (!session) return <section className="section"><div className="container test-shell">Partner-Test wird geladen …</div></section>;

  return (
    <section className="section">
      <div className="container test-shell stack">
        <h1 className="test-title">Welcher Bereich belastet dich aktuell am meisten?</h1>
        <p className="helper">Einzelauswahl · Nach Auswahl geht es automatisch weiter</p>
        <div className="stack">
          {stressOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`answer-button ${session.stressSelection === option.value ? 'selected' : ''}`}
              onClick={() => selectCategory(option.value)}
              disabled={isSaving}
            >
              <strong>{option.label}</strong>
              <span className="helper" style={{ marginTop: 4, display: 'block' }}>{stressCategoryDescriptions[option.value]}</span>
            </button>
          ))}
        </div>
        {error && <p className="inline-error">{error}</p>}
      </div>
    </section>
  );
}
