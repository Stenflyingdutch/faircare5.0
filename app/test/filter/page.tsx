'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { generateQuestions, type TestFilterInput } from '@/services/test/questionGenerator';
import { createTempSessionId, saveLocalSession, type TempSessionData } from '@/services/test/sessionService';

const ageOptions: Array<{ label: string; value: TestFilterInput['youngestAgeGroup'] }> = [
  { label: '0–1 Jahre', value: '0_1' },
  { label: '1–3 Jahre', value: '1_3' },
  { label: '3–6 Jahre', value: '3_6' },
  { label: '6–12 Jahre', value: '6_12' },
  { label: '12–18 Jahre', value: '12_18' },
];

const careOptions = [
  { label: 'keine Betreuung', value: 'none' },
  { label: 'Kita', value: 'kita' },
  { label: 'Tagesmutter', value: 'tagesmutter' },
  { label: 'Großeltern / Familie', value: 'grosseltern_familie' },
  { label: 'Babysitter / Nanny', value: 'babysitter_nanny' },
] as const;

export default function TestFilterPage() {
  const router = useRouter();
  const [childCount, setChildCount] = useState<TestFilterInput['childCount'] | null>(null);
  const [youngestAgeGroup, setYoungestAgeGroup] = useState<TestFilterInput['youngestAgeGroup'] | null>(null);
  const [childcareTags, setChildcareTags] = useState<string[]>([]);
  const [splitClarity, setSplitClarity] = useState<TestFilterInput['splitClarity'] | null>(null);

  const toggleChildcare = (tag: string) => {
    if (tag === 'none') return setChildcareTags(['none']);
    setChildcareTags((prev) => {
      const withoutNone = prev.filter((entry) => entry !== 'none');
      if (withoutNone.includes(tag)) return withoutNone.filter((entry) => entry !== tag);
      return [...withoutNone, tag];
    });
  };

  const canContinue = !!childCount && !!youngestAgeGroup && childcareTags.length > 0 && !!splitClarity;

  const startQuiz = () => {
    if (!canContinue || !childCount || !youngestAgeGroup || !splitClarity) return;

    const filters: TestFilterInput = { childCount, youngestAgeGroup, childcareTags, splitClarity };
    const questions = generateQuestions(filters, 15);

    const session: TempSessionData = {
      tempSessionId: createTempSessionId(),
      childCount,
      youngestAgeGroup,
      childcareTags,
      splitClarity,
      questionIds: questions.map((q) => q.id),
      answers: {},
      stressCategories: [],
      sourcePlatform: 'web',
      createdAt: new Date().toISOString(),
    };

    saveLocalSession(session);
    router.push('/test/quiz');
  };

  return (
    <>
      <PageHero badge="Test" title="Filterfragen" subtitle="4 kurze Fragen vor dem Ownership-Test." />
      <SectionWrapper>
        <Card title="Wie viele Kinder habt ihr?" description="">
          <div className="grid" style={{ gap: '.5rem', marginTop: '1rem' }}>
            {['1', '2', '3+'].map((item) => (
              <button key={item} type="button" className={`button ${childCount === (item === '3+' ? '3_plus' : item) ? 'primary' : 'secondary'}`} onClick={() => setChildCount(item === '3+' ? '3_plus' : (item as '1' | '2'))}>
                {item}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Wie alt ist das jüngste Kind?" description="">
          <div className="grid" style={{ gap: '.5rem', marginTop: '1rem' }}>
            {ageOptions.map((opt) => (
              <button key={opt.value} type="button" className={`button ${youngestAgeGroup === opt.value ? 'primary' : 'secondary'}`} onClick={() => setYoungestAgeGroup(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Welche Betreuung nutzt ihr aktuell?" description="Mehrfachauswahl möglich.">
          <div className="grid" style={{ gap: '.5rem', marginTop: '1rem' }}>
            {careOptions.map((opt) => {
              const selected = childcareTags.includes(opt.value);
              const disableBecauseNone = childcareTags.includes('none') && opt.value !== 'none';
              return (
                <button key={opt.value} type="button" disabled={disableBecauseNone} className={`button ${selected ? 'primary' : 'secondary'}`} onClick={() => toggleChildcare(opt.value)}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Wie klar ist eure Aufteilung heute?" description="">
          <div className="grid" style={{ gap: '.5rem', marginTop: '1rem' }}>
            {[
              { label: 'eher klar', value: 'eher_klar' },
              { label: 'teils klar, teils spontan', value: 'teils_klar' },
              { label: 'oft unklar', value: 'oft_unklar' },
            ].map((opt) => (
              <button key={opt.value} type="button" className={`button ${splitClarity === opt.value ? 'primary' : 'secondary'}`} onClick={() => setSplitClarity(opt.value as TestFilterInput['splitClarity'])}>
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        <button type="button" className="button primary" disabled={!canContinue} onClick={startQuiz}>Weiter zum Test</button>
      </SectionWrapper>
    </>
  );
}
