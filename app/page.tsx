import { Card } from '@/components/Card';
import { CTAButton } from '@/components/CTAButton';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function HomePage() {
  return (
    <>
      <PageHero
        badge="Etappe 1: Plattform-Basis"
        title="Mental Load sichtbar machen und fair gemeinsam tragen."
        subtitle="mental carefair unterstützt Eltern dabei, unsichtbare Planungs- und Denkaufgaben rund um Kinder sichtbar zu machen, gemeinsam zu besprechen und fair zu verteilen."
        actions={<CTAButton href="/login">Kostenlosen Test starten</CTAButton>}
      />

      <SectionWrapper>
        <div className="grid grid-2">
          <Card
            title="Was ist Mental Load?"
            description="Mental Load ist die unsichtbare Organisationsarbeit im Familienalltag: mitdenken, planen, erinnern, koordinieren."
          />
          <Card
            title="Was löst mental carefair?"
            description="Die Plattform verbindet Selbsttest, gemeinsames Ergebnis, Aufgaben-Zuordnung und Weekly Check-ins – für klare Absprachen statt Dauerstress."
          />
        </div>
      </SectionWrapper>

      <SectionWrapper subdued>
        <Card
          title="Fair heißt nicht immer gleich"
          description="Gerechtigkeit in Familien bedeutet nicht automatisch 50/50. Entscheidend ist, dass Verantwortung bewusst und gemeinsam festgelegt wird."
        />
      </SectionWrapper>

      <SectionWrapper>
        <div className="grid grid-2">
          <Card
            title="Newsletter"
            description="Erhalte Einblicke in die Entwicklung, kommende Features und praktische Impulse für einen mental fairen Familienalltag."
          >
            <CTAButton href="/newsletter" variant="secondary">
              Zum Newsletter
            </CTAButton>
          </Card>
          <Card
            title="Wissenschaftliche Hintergründe"
            description="Wir bereiten Studien, Dokus und Hintergrundwissen zum Thema Mental Load für Eltern verständlich auf."
          >
            <CTAButton href="/mental-load" variant="secondary">
              Mehr erfahren
            </CTAButton>
          </Card>
        </div>
      </SectionWrapper>

      <SectionWrapper subdued>
        <Card
          title="Über uns"
          description="Lerne die Geschichte von Nata und Sander kennen: warum wir mental carefair als Eltern von Liam gegründet haben."
        >
          <CTAButton href="/about">Zur Über-uns-Seite</CTAButton>
        </Card>
      </SectionWrapper>
    </>
  );
}
