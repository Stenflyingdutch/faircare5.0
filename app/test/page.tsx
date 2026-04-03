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

type FilterQuestion = {
  id: string;
  text: string;
  options: Array<{ label: string; value: string }>;
};

const FILTER_QUESTIONS: FilterQuestion[] = [
  {
    id: 'household',
    text: 'Lebt ihr aktuell in einem gemeinsamen Haushalt?',
    options: [
      { label: 'Ja', value: 'yes' },
      { label: 'Teilweise', value: 'partly' },
      { label: 'Nein', value: 'no' },
    ],
  },
  {
    id: 'children',
    text: 'Gibt es Betreuungs- oder Familienaufgaben, die regelmäßig koordiniert werden müssen?',
    options: [
      { label: 'Ja, häufig', value: 'high' },
      { label: 'Ja, gelegentlich', value: 'medium' },
      { label: 'Kaum', value: 'low' },
    ],
  },
];

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
  const [stage, setStage] = useState<'filter' | 'quiz' | 'result'>('filter');
  const [filterAnswers, setFilterAnswers] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const filterComplete = Object.keys(filterAnswers).length === FILTER_QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const quizComplete = answeredCount === QUESTIONS.length;

  const totalScore = useMemo(() => Object.values(answers).reduce((sum, value) => sum + value, 0), [answers]);

  return (
    <>
      <PageHero
        badge="Test"
        title="Mental-Load-Test direkt starten"
        subtitle="Der Test startet mit Filterfragen. Registrierung ist erst nach dem Gesamtergebnis nötig, um Detailergebnisse zu öffnen."
      />

      <SectionWrapper>
        {stage === 'filter' && (
          <div style={{ width: 'min(760px, 100%)', display: 'grid', gap: '1rem' }}>
            {FILTER_QUESTIONS.map((question, index) => (
              <Card key={question.id} title={`Filterfrage ${index + 1}`} description={question.text}>
                <div style={{ display: 'grid', gap: '.5rem', marginTop: '1rem' }}>
                  {question.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className={`button ${filterAnswers[question.id] === option.value ? 'primary' : 'secondary'}`}
                      onClick={() => setFilterAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Card>
            ))}

            <Card title="Weiter zum Test" description={`${Object.keys(filterAnswers).length} von ${FILTER_QUESTIONS.length} Filterfragen beantwortet`}>
              <div style={{ marginTop: '1rem' }}>
                <button type="button" className="button primary" disabled={!filterComplete} onClick={() => setStage('quiz')}>
                  Mit Testfragen starten
                </button>
              </div>
            </Card>
          </div>
        )}

        {stage === 'quiz' && (
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

            <Card title="Fortschritt" description={`${answeredCount} von ${QUESTIONS.length} Fragen beantwortet`}>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="button secondary" onClick={() => setStage('filter')}>
                  Zurück zu Filterfragen
                </button>
                <button type="button" className="button primary" disabled={!quizComplete} onClick={() => setStage('result')}>
                  Gesamtergebnis anzeigen
                </button>
              </div>
            </Card>
          </div>
        )}

        {stage === 'result' && (
          <div style={{ width: 'min(760px, 100%)', display: 'grid', gap: '1rem' }}>
            <Card title="Euer vorläufiges Gesamtergebnis" description={`Gesamtscore: ${totalScore} von ${QUESTIONS.length * 4}`}>
              <p style={{ marginTop: '1rem' }}>{getSummary(totalScore)}</p>
            </Card>

            <Card
              title="Detailergebnis freischalten"
              description="Registriere dich jetzt oder logge dich ein, um individuelle Kategorien und das detaillierte Ergebnis zu sehen."
            >
              <div style={{ marginTop: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                <CTAButton href="/login?mode=register">Jetzt registrieren für Detailergebnis</CTAButton>
                <CTAButton href="/login" variant="secondary">
                  Bereits Konto? Einloggen
                </CTAButton>
              </div>
            </Card>
          </div>
        )}
      </SectionWrapper>
    </>
  );
}
