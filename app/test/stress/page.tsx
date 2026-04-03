'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { STRESS_CATEGORIES } from '@/services/test/questionPool';
import { loadLocalSession, saveLocalSession } from '@/services/test/sessionService';

export default function TestStressPage() {
  const router = useRouter();
  const [session, setSession] = useState(loadLocalSession());

  if (!session) {
    router.replace('/test/filter');
    return null;
  }

  const toggle = (label: string) => {
    const selected = session.stressCategories.includes(label)
      ? session.stressCategories.filter((item) => item !== label)
      : [...session.stressCategories, label];
    const next = { ...session, stressCategories: selected };
    setSession(next);
    saveLocalSession(next);
  };

  return (
    <>
      <PageHero badge="Test" title="Belastende Bereiche (optional)" subtitle="Welche Bereiche belasten dich aktuell am meisten?" />
      <SectionWrapper>
        <Card title="Mehrfachauswahl" description="Optional">
          <div className="grid" style={{ gap: '.75rem', marginTop: '1rem' }}>
            {STRESS_CATEGORIES.map((item) => (
              <button key={item} type="button" className={`button ${session.stressCategories.includes(item) ? 'primary' : 'secondary'}`} onClick={() => toggle(item)}>
                {item}
              </button>
            ))}
          </div>
        </Card>

        <button type="button" className="button primary" onClick={() => router.push('/test/result')}>Kurz-Auswertung anzeigen</button>
      </SectionWrapper>
    </>
  );
}
