import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

const adminAreas = [
  'Quizfragen',
  'Ergebnis-Texte',
  'Aufgabenkatalog',
  'Seiteninhalte',
  'Weekly Check-in Templates',
];

export default function AdminPage() {
  return (
    <>
      <PageHero
        badge="Admin (Platzhalter)"
        title="Admin-Bereich"
        subtitle="Später nur für Nutzer:innen mit Rolle admin sichtbar. Aktuell nur strukturelle Vorbereitung."
      />
      <SectionWrapper>
        <div className="grid grid-3">
          {adminAreas.map((item) => (
            <Card key={item} title={item} description="Bearbeitung folgt in späteren Etappen." />
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
