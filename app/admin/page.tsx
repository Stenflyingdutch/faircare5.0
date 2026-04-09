import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import { resolveAgeGroupLabel } from '@/components/test/test-config';
import Link from 'next/link';
import { LoginBackButton } from '@/components/personal/LoginBackButton';

const adminAreas = ['Ergebnis-Texte', 'Katalog für Verantwortlichkeiten', 'Seiteninhalte', 'Weekly Check-in Templates', 'Ownership-Vorlagen'];
const ageGroups = ['0_1', '1_3', '3_6', '6_10', '10_plus'] as const;

export default function AdminPage() {
  return (
    <>
      <PageHero
        badge="Admin"
        title="Admin-Bereich"
        subtitle="Hier werden Inhalte gepflegt und strukturiert verwaltet."
      />
      <SectionWrapper>
        <LoginBackButton fallbackHref="/app/einstellungen" label="Zurück zu Einstellungen" />
        <article className="card stack" style={{ marginBottom: 16 }}>
          <h3 className="card-title">Altersgruppen</h3>
          <p className="card-description">Die bestehenden Admin-Bereiche sind für alle aktuell gepflegten Altersgruppen befüllt.</p>
          <div className="chip-row">
            {ageGroups.map((item) => <span key={item} className="option-chip selected">{resolveAgeGroupLabel(item)}</span>)}
          </div>
          <Link href="/admin/questions" className="button primary">Fragenkatalog bearbeiten</Link>
        </article>

        <div className="grid grid-3">
          {adminAreas.map((item) => (
            <Card key={item} title={item} description="Dieser Bereich ist als Platzhalter vorbereitet." />
          ))}

          <article className="card">
            <h3 className="card-title">Nutzerverwaltung</h3>
            <p className="card-description">Nutzer suchen, Adminrechte verwalten, Konten sperren oder sicher löschen.</p>
            <Link href="/admin/users" className="button primary">Nutzer verwalten</Link>
          </article>
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
            <h3 className="card-title">Ownership-Pakete für Verantwortlichkeiten</h3>
            <p className="card-description">Globale Vorlagen pro Altersgruppe, Kategorie und Sprache für den Ownership-Start.</p>
            <Link href="/admin/task-packages" className="button primary">Ownership-Vorlagen verwalten</Link>
          </article>
        </div>
      </SectionWrapper>
    </>
  );
}
