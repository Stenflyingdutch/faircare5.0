'use client';

import { useMemo } from 'react';
import { LoginBackButton } from '@/components/personal/LoginBackButton';

import { resultLogicDocumentation } from '@/services/resultInsights';

export default function AdminResultLogicPage() {
  const thresholdEntries = useMemo(() => Object.entries(resultLogicDocumentation.thresholds), []);

  return (
    <section className="section">
      <div className="container stack">
        <h1 className="test-title">Admin · Ergebnislogik</h1>
        <p className="helper">Diese Seite dokumentiert transparent, wie FairCare individuelle und gemeinsame Ergebnisse berechnet.</p>

        <article className="card stack">
          <h2 className="card-title">Datenbasis</h2>
          <ul>
            {resultLogicDocumentation.dataBasis.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="card stack">
          <h2 className="card-title">Schwellenwerte</h2>
          <div className="grid grid-2">
            {thresholdEntries.map(([key, value]) => (
              <div key={key} className="report-block">
                <strong>{key}</strong>
                <p>{String(value)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card stack">
          <h2 className="card-title">Regeln für Erkenntnisse</h2>
          <ul>
            {resultLogicDocumentation.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
          <p className="helper">Die gleichen Werte werden in der Ergebnisansicht genutzt, damit Doku und Produktlogik konsistent bleiben.</p>
        </article>

        <article className="card stack">
          <h2 className="card-title">Block-Logik im Gesamtergebnis</h2>
          <div className="report-block">
            <strong>Block 1</strong>
            <p>{resultLogicDocumentation.blockLogic.block1}</p>
          </div>
          <div className="report-block">
            <strong>Block 2</strong>
            <p>{resultLogicDocumentation.blockLogic.block2}</p>
          </div>
          <div className="report-block">
            <strong>Konsistenzprüfung Startfrage ↔ Test</strong>
            <p>{resultLogicDocumentation.consistencyLogic}</p>
          </div>
        </article>

        <LoginBackButton fallbackHref="/admin" label="Zurück zu Admin" />
      </div>
    </section>
  );
}
