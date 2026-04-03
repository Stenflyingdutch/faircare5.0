import Link from 'next/link';

export default function TestLandingPage() {
  return (
    <section className="section">
      <div className="container test-shell stack">
        <p className="badge">Etappe 2 · Öffentlicher Test</p>
        <h1 className="hero-title">Ownership-Test für Eltern von Babys (0–1)</h1>
        <p className="hero-subtitle">
          Beantworte 15 kurze Fragen zur aktuellen Verantwortungsverteilung. Ohne Registrierung, mobil optimiert und mit
          direkter Kurz-Auswertung.
        </p>
        <div>
          <Link href="/test/filter" className="cta-button primary">
            Test starten
          </Link>
        </div>
      </div>
    </section>
  );
}
