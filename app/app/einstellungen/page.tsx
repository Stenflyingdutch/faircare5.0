'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { observeAuthState, signOutUser } from '@/services/auth.service';
import { fetchAppUserProfile } from '@/services/partnerFlow.service';
import { isAdminProfile } from '@/services/user-profile.service';

const baseSettingsEntries = [
  {
    title: 'Persönliche Einstellungen',
    description: 'Profil, E-Mail-Adresse und Passwort verwalten',
    href: '/app/einstellungen/persoenliche-einstellungen',
  },
  {
    title: 'Check-in Planung',
    description: 'Frequenz, Tag und Erinnerung für euren Check-in festlegen',
    href: '/app/einstellungen/team-check-planung',
  },
  {
    title: 'Quizergebnisse einsehen',
    description: 'Zur bestehenden Ergebnisübersicht wechseln',
    href: '/app/transparenz',
  },
] as const;

const adminSettingsEntry = {
  title: 'Adminbereich',
  description: 'Nutzerverwaltung, Inhalte und Systembereiche für Admins öffnen',
  href: '/admin',
} as const;

export default function EinstellungenPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => observeAuthState(async (user) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const profile = await fetchAppUserProfile(user.uid);
      setIsAdmin(isAdminProfile(profile));
    } catch {
      setIsAdmin(false);
    }
  }), []);

  const settingsEntries = useMemo(
    () => (isAdmin ? [...baseSettingsEntries, adminSettingsEntry] : baseSettingsEntries),
    [isAdmin],
  );

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
            <span className="helper settings-menu-description">{entry.description}</span>
          </Link>
        ))}
      </div>

      <div style={{ paddingTop: '4px' }}>
        <button type="button" className="button" onClick={onLogout}>Logout</button>
      </div>
    </article>
  );
}
