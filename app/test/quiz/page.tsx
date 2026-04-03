'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { loadQuestionPool } from '@/services/test/templateService';
import { OWNERSHIP_OPTIONS, type OwnershipOption, type OwnershipQuestion } from '@/services/test/questionPool';
import { loadLocalSession, saveLocalSession } from '@/services/test/sessionService';

export default function TestQuizPage() {
  const router = useRouter();
  const [session, setSession] = useState(loadLocalSession());
  const [pool, setPool] = useState<OwnershipQuestion[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!session) router.replace('/test/filter');
  }, [router, session]);

  useEffect(() => {
    loadQuestionPool().then(setPool);
  }, []);

  const questions = useMemo(() => pool.filter((q) => session?.questionIds.includes(q.id)), [pool, session?.questionIds]);

  if (!session || !questions.length) return null;

  const current = questions[index];

  const saveAnswer = (value: OwnershipOption) => {
    const next = { ...session, answers: { ...session.answers, [current.id]: value } };
    setSession(next);
    saveLocalSession(next);

    if (index < questions.length - 1) {
      setIndex((v) => v + 1);
    } else {
      router.push('/test/stress');
    }
  };

  const progress = Math.round(((index + 1) / questions.length) * 100);

  return (
    <>
      <PageHero badge="Test" title={`Frage ${index + 1} von ${questions.length}`} subtitle={`Fortschritt ${progress}%`} />
      <SectionWrapper>
        <Card title="Wer ist aktuell verantwortlich für diese Aufgabe?" description={current.text}>
          <div className="grid" style={{ gap: '.75rem', marginTop: '1rem' }}>
            {OWNERSHIP_OPTIONS.map((option) => (
              <button key={option.value} type="button" className="button secondary" onClick={() => saveAnswer(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </Card>
      </SectionWrapper>
    </>
  );
}
