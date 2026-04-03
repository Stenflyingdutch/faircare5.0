'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { calculateQuickResult } from '@/services/test/resultCalculator';
import { loadQuestionPool } from '@/services/test/templateService';
import type { OwnershipQuestion } from '@/services/test/questionPool';
import { clearLocalSession, loadLocalSession, persistResultPreview, persistSessionToFirestore } from '@/services/test/sessionService';

export default function TestResultPage() {
  const router = useRouter();
  const [session] = useState(loadLocalSession());
  const [pool, setPool] = useState<OwnershipQuestion[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) router.replace('/test/filter');
  }, [router, session]);

  useEffect(() => {
    loadQuestionPool().then(setPool);
  }, []);

  const questions = useMemo(() => pool.filter((q) => session?.questionIds.includes(q.id)), [pool, session?.questionIds]);
  const result = useMemo(() => {
    if (!session || !questions.length) return null;
    return calculateQuickResult(questions, session.answers, session.stressCategories);
  }, [questions, session]);

  useEffect(() => {
    if (!session || !result || saved) return;
    const complete = { ...session, completedAt: new Date().toISOString() };

    Promise.all([
      persistSessionToFirestore(complete),
      persistResultPreview(complete.tempSessionId, result),
    ]).finally(() => setSaved(true));
  }, [result, saved, session]);

  if (!session || !result) return null;

  return (
    <>
      <PageHero badge="Kurz-Auswertung" title="Dein Ergebnis auf einen Blick" subtitle="Etappe 2: ohne Registrierung" />
      <SectionWrapper>
        <Card title="Gesamtverteilung" description="Ownership aus deiner Sicht">
          <p>Du {result.youPercent}%</p>
          <p>Partner {result.partnerPercent}%</p>
        </Card>

        <Card title="Besonders sichtbar in" description="Top-Bereiche">
          <ul>
            {result.topCategories.map((cat) => <li key={cat}>{cat}</li>)}
          </ul>
        </Card>

        {result.stressCategories.length ? (
          <Card title="Aktuell besonders belastend" description="Deine Auswahl">
            <ul>
              {result.stressCategories.map((cat) => <li key={cat}>{cat}</li>)}
            </ul>
          </Card>
        ) : null}

        <Card title="Kurzfazit" description={result.summary} />

        <button type="button" className="button primary" onClick={() => router.push('/test')}>Auswertung speichern und vollständig ansehen</button>
        <button type="button" className="button secondary" onClick={() => { clearLocalSession(); router.push('/test/filter'); }}>Neuen Test starten</button>
      </SectionWrapper>
    </>
  );
}
