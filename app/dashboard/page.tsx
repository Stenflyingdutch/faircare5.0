import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

const cards = ['Eigenes Ergebnis', 'Gemeinsames Ergebnis', 'Aufgabenbereiche', 'Weekly Check-in'];

export default function DashboardPage() {
  return (
    <>
      <PageHero
        badge="Dashboard"
        title="Eure gemeinsame Übersicht"
        subtitle="Hier seht ihr später gebündelt Ergebnisse, Verantwortungsbereiche und euren Wochen-Check-in."
      />
      <SectionWrapper>
        <div className="grid grid-2">
          {cards.map((title) => (
            <Card key={title} title={title} description="Dieser Bereich ist vorbereitet und wird im nächsten Schritt mit Inhalten ergänzt." />
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
