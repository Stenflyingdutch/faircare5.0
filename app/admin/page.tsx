import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import Link from 'next/link';

const adminAreas = ['Ergebnis-Texte', 'Aufgabenkatalog', 'Seiteninhalte', 'Weekly Check-in Templates', 'Ownership-Vorlagen'];
const ageGroups = ['0–1', '1–3', '3–6', '6–10', '10+'];

export default function AdminPage() {
  return (
    <>
      <PageHero
        badge="Admin"
        title="Admin-Bereich"
        subtitle="Hier werden Inhalte gepflegt und strukturiert verwaltet."
      />
      <SectionWrapper>
        <article className="card stack" style={{ marginBottom: 16 }}>
          <h3 className="card-title">Altersgruppen (vorbereitet)</h3>
          <p className="card-description">Die Navigation für weitere Altersgruppen ist bereits sichtbar. Inhalte können schrittweise ergänzt werden.</p>
          <div className="chip-row">
            {ageGroups.map((item) => <span key={item} className="option-chip selected">{item}</span>)}
          </div>
          <Link href="/admin/questions" className="button primary">Fragenkatalog bearbeiten</Link>
        </article>

        <div className="grid grid-3">
          {adminAreas.map((item) => (
            <Card key={item} title={item} description="Dieser Bereich ist als Platzhalter vorbereitet." />
          ))}

          <article className="card">
            <h3 className="card-title">Textbausteine</h3>
            <p className="card-description">Zentrale mehrsprachige UI-Texte für Navigation, Quiz, Admin und Systemmeldungen.</p>
            <Link href="/admin/texts" className="button primary">Textbausteine bearbeiten</Link>
          </article>
          <article className="card">
            <h3 className="card-title">Ergebnislogik</h3>
            <p className="card-description">Transparente Dokumentation zu Berechnung, Vergleich, Schwellenwerten und Empfehlungen.</p>
            <Link href="/admin/logic" className="button primary">Zur Logik-Seite</Link>
          </article>

          <article className="card">
            <h3 className="card-title">User Management</h3>
            <p className="card-description">Admins verwalten hier Nutzerkonten inklusive Suche, Sperrung und vollständiger Löschung.</p>
            <Link href="/admin/users" className="button primary">User verwalten</Link>
          </article>

          <article className="card">
            <h3 className="card-title">Ownership-Aufgabenpakete</h3>
            <p className="card-description">Globale Vorlagen pro Altersgruppe, Kategorie und Sprache für den Ownership-Start.</p>
            <Link href="/admin/task-packages" className="button primary">Ownership-Vorlagen verwalten</Link>
          </article>
        </div>
      </SectionWrapper>
    </>
  );
}
