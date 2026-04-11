interface MentalLoadExample {
  id: string;
  ageLabel?: string;
  task: string;
  mentalLoad: string;
}

const mentalLoadExamples: MentalLoadExample[] = [
  {
    id: 'baby-diaper',
    ageLabel: 'Baby',
    task: 'Windel wechseln',
    mentalLoad: 'Daran denken, Windeln rechtzeitig zu kaufen',
  },
  {
    id: 'baby-health',
    ageLabel: 'Baby',
    task: 'Zum Kinderarzt gehen',
    mentalLoad: 'Impftermin vereinbaren und im Blick behalten',
  },
  {
    id: 'toddler-kita',
    ageLabel: 'Kleinkind',
    task: 'Kind zur Kita bringen',
    mentalLoad: 'Infos aus der Kita und Elterninformationen im Blick behalten',
  },
  {
    id: 'school-sport',
    ageLabel: '6 bis 12 Jahre',
    task: 'Zum Sport fahren',
    mentalLoad: 'Anmeldung, Termine und Ausrüstung im Blick behalten',
  },
];

export function MentalLoadComparisonSection() {
  return (
    <article className="landing-mental-load-focus" aria-labelledby="landing-mental-load-focus-title">
      <h2 id="landing-mental-load-focus-title" className="landing-mental-load-focus-title">
        Mental Load ist mehr als Erledigen
      </h2>
      <p className="landing-mental-load-focus-text">
        FairCare macht sichtbar, wer mitdenkt, plant und im Alltag den Überblick behält.
      </p>

      <div className="landing-mental-load-comparison-grid" role="list" aria-label="Vergleich Aufgabe und Mental Load">
        {mentalLoadExamples.map((example) => (
          <section key={example.id} className="landing-mental-load-card" role="listitem" aria-label={example.ageLabel}>
            {example.ageLabel ? <p className="landing-mental-load-age-label">{example.ageLabel}</p> : null}

            <div className="landing-mental-load-row landing-mental-load-row--task">
              <p className="landing-mental-load-label">Aufgabe</p>
              <p className="landing-mental-load-value">{example.task}</p>
            </div>

            <div className="landing-mental-load-row landing-mental-load-row--focus">
              <p className="landing-mental-load-label landing-mental-load-label--focus">Mental Load</p>
              <p className="landing-mental-load-value landing-mental-load-value--focus">{example.mentalLoad}</p>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
