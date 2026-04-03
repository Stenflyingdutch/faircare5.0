'use client';

import { useMemo, useState } from 'react';

import { Card } from '@/components/Card';
import { CTAButton } from '@/components/CTAButton';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

type Question = {
  id: string;
  text: string;
  options: Array<{ label: string; score: number }>;
};

const QUESTIONS: Question[] = [
  {
    id: 'planning',
    text: 'Ich plane Familienaufgaben meist alleine im Kopf.',
    options: [
      { label: 'Selten', score: 1 },
      { label: 'Manchmal', score: 2 },
      { label: 'Oft', score: 3 },
      { label: 'Fast immer', score: 4 },
    ],
  },
  {
    id: 'reminders',
    text: 'Ich erinnere häufiger an Termine und To-dos als mein Gegenüber.',
    options: [
      { label: 'Selten', score: 1 },
      { label: 'Manchmal', score: 2 },
      { label: 'Oft', score: 3 },
      { label: 'Fast immer', score: 4 },
    ],
  },
  {
    id: 'followup',
    text: 'Ich halte nach, ob Aufgaben wirklich erledigt wurden.',
    options: [
      { label: 'Selten', score: 1 },
      { label: 'Manchmal', score: 2 },
      { label: 'Oft', score: 3 },
      { label: 'Fast immer', score: 4 },
    ],
  },
];

const getSummary = (score: number) => {
  if (score <= 5) return 'Euer Mental-Load wirkt aktuell vergleichsweise ausgeglichen.';
  if (score <= 8) return 'Es gibt erste Anzeichen für ungleiche Denk- und Planungsarbeit.';
  return 'Die Antworten deuten auf eine deutlich erhöhte Mental-Load-Belastung hin.';
};

export default function TestPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === QUESTIONS.length;

  const totalScore = useMemo(() => Object.values(answers).reduce((sum, value) => sum + value, 0), [answers]);

  return (
    <>
      <PageHero
        badge="Test"
        title="Mental-Load-Test direkt starten"
        subtitle="Du startest den Test sofort. Eine Registrierung wird erst nach dem Gesamtergebnis für das Detailergebnis benötigt."
      />

      <SectionWrapper>
        {!submitted ? (
          <div style={{ width: 'min(760px, 100%)', display: 'grid', gap: '1rem' }}>
            {QUESTIONS.map((question, index) => (
              <Card key={question.id} title={`Frage ${index + 1}`} description={question.text}>
                <div style={{ display: 'grid', gap: '.5rem', marginTop: '1rem' }}>
                  {question.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className={`button ${answers[question.id] === option.score ? 'primary' : 'secondary'}`}
                      onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.score }))}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Card>
            ))}

            <Card
              title="Fortschritt"
              description={`${answeredCount} von ${QUESTIONS.length} Fragen beantwortet`}
            >
              <div style={{ marginTop: '1rem' }}>
                <button type="button" className="button primary" disabled={!isComplete} onClick={() => setSubmitted(true)}>
                  Gesamtergebnis anzeigen
                </button>
              </div>
            </Card>
          </div>
        ) : (
          <div style={{ width: 'min(760px, 100%)', display: 'grid', gap: '1rem' }}>
            <Card
              title="Euer vorläufiges Gesamtergebnis"
              description={`Gesamtscore: ${totalScore} von ${QUESTIONS.length * 4}`}
            >
              <p style={{ marginTop: '1rem' }}>{getSummary(totalScore)}</p>
            </Card>

            <Card
              title="Detailergebnis freischalten"
              description="Für euer persönliches Detailergebnis mit Kategorien und Empfehlungen bitte jetzt registrieren oder einloggen."
            >
              <div style={{ marginTop: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                <CTAButton href="/login">Registrieren / Login für Detailergebnis</CTAButton>
                <button type="button" className="button secondary" onClick={() => setSubmitted(false)}>
                  Antworten anpassen
                </button>
              </div>
            </Card>
          </div>
        )}
      </SectionWrapper>
    </>
  );
}
