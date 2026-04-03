import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="page-card">
      <h1>Willkommen bei FairCare</h1>
      <p>
        Das ist die neue Startseite von Etappe 1. Hier entsteht eine klare Basis für eine Plattform,
        die mentale Last sichtbar macht und Care-Arbeit fairer verteilt.
      </p>

      <h2>Was du jetzt schon findest</h2>
      <ul>
        <li>Informationen zum Thema Mental Load</li>
        <li>Eine Über-uns-Seite mit unserem Ziel</li>
        <li>Newsletter-Anmeldung als erster Touchpoint</li>
        <li>Login, Dashboard und Admin als Platzhalter für die nächsten Etappen</li>
      </ul>

      <Link className="button-link" href="/mental-load">
        Mehr zu Mental Load
      </Link>
    </section>
  );
}
