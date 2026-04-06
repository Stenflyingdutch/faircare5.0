'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { signOutUser } from '@/services/auth.service';

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
  const router = useRouter();

  async function onLogout() {
    await signOutUser();
    router.push('/login');
  }

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

      <div style={{ paddingTop: '4px' }}>
        <button type="button" className="button" onClick={onLogout}>Logout</button>
      </div>
    </article>
  );
}
