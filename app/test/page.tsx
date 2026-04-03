'use client';

import { useMemo, useState } from 'react';

import { Card } from '@/components/Card';
import { CTAButton } from '@/components/CTAButton';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { savePublicTestResponse } from '@/services/firestore.service';

type Question = {
  id: string;
  text: string;
  options: Array<{ label: string; score: number }>;
};

type FilterQuestion = {
  id: string;
  text: string;
  options: Array<{ label: string; value: string }>;
  multi?: boolean;
};

type FilterAnswers = Record<string, string | string[]>;

const FILTER_QUESTIONS: FilterQuestion[] = [
  {
    id: 'childrenCount',
    text: 'Wie viele Kinder leben im Haushalt?',
    options: [
      { label: '1 Kind', value: '1' },
      { label: '2 Kinder', value: '2' },
      { label: '3 Kinder', value: '3' },
      { label: '4+ Kinder', value: '4plus' },
    ],
  },
  {
    id: 'childrenAge',
    text: 'Wie alt sind die Kinder? (Mehrfachauswahl möglich)',
    multi: true,
    options: [
      { label: '0-1', value: '0-1' },
      { label: '1-3', value: '1-3' },
      { label: '3-6', value: '3-6' },
      { label: '6-12', value: '6-12' },
      { label: '12-18', value: '12-18' },
    ],
  },
  {
    id: 'externalCare',
    text: 'Externe Betreuung',
    options: [
      { label: 'Keine', value: 'none' },
      { label: 'KITA/Tagesmutter', value: 'kita_tagesmutter' },
      { label: 'Nanny', value: 'nanny' },
      { label: 'Eltern', value: 'grandparents' },
      { label: 'Freunde', value: 'friends' },
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
  const [filterAnswers, setFilterAnswers] = useState<FilterAnswers>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const filterComplete = FILTER_QUESTIONS.every((question) => {
    const answer = filterAnswers[question.id];
    if (question.multi) return Array.isArray(answer) && answer.length > 0;
    return typeof answer === 'string' && answer.length > 0;
  });

  const answeredCount = Object.keys(answers).length;
  const quizComplete = answeredCount === QUESTIONS.length;

  const totalScore = useMemo(() => Object.values(answers).reduce((sum, value) => sum + value, 0), [answers]);

  const toggleMultiValue = (id: string, value: string) => {
    setFilterAnswers((prev) => {
      const existing = Array.isArray(prev[id]) ? prev[id] : [];
      const next = existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value];
      return { ...prev, [id]: next };
    });
  };

  const saveToFirebase = async () => {
    setSaveState('saving');
    try {
      await savePublicTestResponse({
        filterAnswers,
        quizAnswers: answers,
        totalScore,
        createdAt: new Date().toISOString(),
      });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <>
      <PageHero
        badge="Test"
        title="Mental-Load-Test direkt starten"
        subtitle="Filter- und Quizfragen werden in Firebase gespeichert. Registrierung ist erst nach dem Gesamtergebnis nötig."
      />

      <SectionWrapper>
        {stage === 'filter' && (
          <div style={{ width: 'min(760px, 100%)', display: 'grid', gap: '1rem' }}>
            {FILTER_QUESTIONS.map((question, index) => (
              <Card key={question.id} title={`Filterfrage ${index + 1}`} description={question.text}>
                <div style={{ display: 'grid', gap: '.5rem', marginTop: '1rem' }}>
                  {question.options.map((option) => {
                    const selected = question.multi
                      ? Array.isArray(filterAnswers[question.id]) && filterAnswers[question.id].includes(option.value)
                      : filterAnswers[question.id] === option.value;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        className={`button ${selected ? 'primary' : 'secondary'}`}
                        onClick={() => (question.multi ? toggleMultiValue(question.id, option.value) : setFilterAnswers((prev) => ({ ...prev, [question.id]: option.value })))}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
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
                <button
                  type="button"
                  className="button primary"
                  disabled={!quizComplete || saveState === 'saving'}
                  onClick={async () => {
                    await saveToFirebase();
                    setStage('result');
                  }}
                >
                  Gesamtergebnis anzeigen
                </button>
              </div>
              {saveState === 'saving' && <p style={{ marginTop: '.5rem' }}>Speichere Antworten…</p>}
              {saveState === 'error' && <p style={{ marginTop: '.5rem', color: '#b42318' }}>Speichern fehlgeschlagen. Ergebnis wird lokal angezeigt.</p>}
            </Card>
          </div>
        )}

        {stage === 'result' && (
          <div style={{ width: 'min(760px, 100%)', display: 'grid', gap: '1rem' }}>
            <Card title="Euer vorläufiges Gesamtergebnis" description={`Gesamtscore: ${totalScore} von ${QUESTIONS.length * 4}`}>
              <p style={{ marginTop: '1rem' }}>{getSummary(totalScore)}</p>
              {saveState === 'saved' && <p style={{ marginTop: '.5rem', color: '#027a48' }}>Filter- und Quizantworten wurden in Firebase gespeichert.</p>}
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
