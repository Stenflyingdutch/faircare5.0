import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

const cards = [
  'Eigenes Ergebnis',
  'Gemeinsames Ergebnis',
  'Aufgabenbereiche',
  'Weekly Check-in',
];

export default function DashboardPage() {
  return (
    <>
      <PageHero
        badge="Geschützter Bereich (Platzhalter)"
        title="Dashboard"
        subtitle="Hier wird später eure gemeinsame Übersicht mit Ergebnissen, Aufgaben und Check-ins angezeigt."
      />
      <SectionWrapper>
        <div className="grid grid-2">
          {cards.map((title) => (
            <Card
              key={title}
              title={title}
              description="Dieser Bereich ist vorbereitet und wird in Etappe 2 mit echter Logik und Daten befüllt."
            />
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
