import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';
import Link from 'next/link';

const adminAreas = ['Quizfragen', 'Ergebnis-Texte', 'Aufgabenkatalog', 'Seiteninhalte', 'Weekly Check-in Templates'];

export default function AdminPage() {
  return (
    <>
      <PageHero
        badge="Admin"
        title="Admin-Bereich"
        subtitle="Hier werden später Inhalte gepflegt und strukturiert verwaltet."
      />
      <SectionWrapper>
        <div className="grid grid-3">
          {adminAreas.map((item) => (
            <Card key={item} title={item} description="Dieser Bereich ist als Platzhalter vorbereitet." />
          ))}
          <article className="card">
            <h3 className="card-title">Ergebnislogik</h3>
            <p className="card-description">Transparente Dokumentation zu Berechnung, Vergleich, Schwellenwerten und Empfehlungen.</p>
            <Link href="/admin/logic" className="button primary">Zur Logik-Seite</Link>
          </article>
        </div>
      </SectionWrapper>
    </>
  );
}
