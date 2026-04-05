import Link from 'next/link';

const settingsEntries = [
  {
    title: 'Persönliche Einstellungen',
    description: 'Profil, E-Mail-Adresse und Passwort verwalten',
    href: '/app/einstellungen/persoenliche-einstellungen',
  },
  {
    title: 'Team-Check Planung',
    description: 'Frequenz, Tag und Erinnerung für euren Team-Check festlegen',
    href: '/app/einstellungen/team-check-planung',
  },
  {
    title: 'Quizergebnisse einsehen',
    description: 'Zur bestehenden Ergebnisübersicht wechseln',
    href: '/app/ergebnisse',
  },
] as const;

export default function EinstellungenPage() {
  return (
    <article className="card stack">
      <h2 className="card-title">Einstellungen</h2>
      <p className="helper" style={{ margin: 0 }}>Wähle einen Bereich aus.</p>

      <div className="settings-menu-list">
        {settingsEntries.map((entry) => (
          <Link key={entry.href} href={entry.href} className="settings-menu-entry">
            <span className="settings-menu-title">{entry.title}</span>
            <span className="helper">{entry.description}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}
