import Link from 'next/link';

import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';

const cards = [
  ['Nutzer gesamt', '—'],
  ['Aktive Nutzer', '—'],
  ['Neue Nutzer (7 Tage)', '—'],
  ['Neue Nutzer (30 Tage)', '—'],
  ['Abgeschlossene Quizze', '—'],
  ['Fehlende Übersetzungen', '—'],
];

export default function AdminDashboardPage() {
  return (
    <div className="admin-page-stack">
      <AdminPageHeader
        title="Dashboard"
        description="Zentrale Übersicht für Inhalte, Nutzer, Übersetzungen und letzte Änderungen."
      />
      <section className="admin-kpi-grid">
        {cards.map(([label, value]) => (
          <article key={label} className="admin-kpi-card">
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="admin-module-card">
        <h2>Schnellzugriffe</h2>
        <div className="admin-quick-links">
          <Link href="/admin/questions" className="button">Fragenkatalog</Link>
          <Link href="/admin/content" className="button">Texte und Header</Link>
          <Link href="/admin/emails" className="button">E-Mail-Templates</Link>
          <Link href="/admin/users" className="button">Nutzerverwaltung</Link>
        </div>
      </section>
    </div>
  );
}
