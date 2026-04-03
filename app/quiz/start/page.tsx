import Link from 'next/link';

export default function QuizStartPage() {
  return (
    <section className="section">
      <div className="container test-shell stack">
        <p className="badge">Öffentlicher Quiz-Flow</p>
        <h1 className="hero-title">Ownership-Test für Eltern</h1>
        <p className="hero-subtitle">
          Du kannst den Test ohne Registrierung starten. Nach der Kurz-Auswertung entscheidest du, ob du den ausführlichen Bericht
          per Registrierung freischaltest oder anonym beendest.
        </p>
        <div>
          <Link href="/quiz/filter" className="cta-button primary">
            Test starten
          </Link>
        </div>
      </div>
    </section>
  );
}
