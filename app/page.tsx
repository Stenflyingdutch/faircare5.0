import { Card } from '@/components/Card';
import { CTAButton } from '@/components/CTAButton';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function HomePage() {
  return (
    <>
      <PageHero
        title="Mental Load sichtbar machen. Verantwortung klar verteilen."
        subtitle="FairCare hilft Eltern, unsichtbare Denk- und Planungsarbeit offen zu besprechen und als Team fair zu organisieren."
        actions={<CTAButton href="/quiz/filter">Jetzt kostenlosen Test machen</CTAButton>}
      />

      <SectionWrapper>
        <div className="grid grid-2">
          <Card
            title="Was ist Mental Load?"
            description="Mental Load ist die unsichtbare Organisationsarbeit im Familienalltag: mitdenken, planen, erinnern und koordinieren."
          />
          <Card
            title="Was löst FairCare?"
            description="Ihr bekommt einen klaren Überblick, sprecht über echte Belastung und verteilt Verantwortung bewusst statt nebenbei."
          />
        </div>
      </SectionWrapper>

      <SectionWrapper subdued>
        <Card
          title="Fair heißt nicht immer gleich"
          description="Fair bedeutet nicht automatisch 50/50. Entscheidend ist, dass ihr Aufgaben transparent besprecht und Verantwortung so verteilt, dass sie zu eurem Alltag passt."
        />
      </SectionWrapper>

      <SectionWrapper>
        <div className="grid grid-2">
          <Card
            title="Newsletter"
            description="Erhalte klare Updates, neue Inhalte und praktische Impulse für einen entspannteren Familienalltag."
          >
            <div style={{ marginTop: '1rem' }}>
              <CTAButton href="/newsletter" variant="secondary">
                Zum Newsletter
              </CTAButton>
            </div>
          </Card>
          <Card
            title="Wissenschaftliche Hintergründe"
            description="Wir bereiten Studien und Hintergrundwissen verständlich auf, damit du schnell einordnen kannst, was euch wirklich hilft."
          >
            <div style={{ marginTop: '1rem' }}>
              <CTAButton href="/mental-load" variant="secondary">
                Mehr erfahren
              </CTAButton>
            </div>
          </Card>
        </div>
      </SectionWrapper>

      <SectionWrapper subdued>
        <Card
          title="Über uns"
          description="Erfahre, warum wir FairCare gegründet haben und weshalb faire Verantwortung in Familien unser Herzensthema ist."
        >
          <div style={{ marginTop: '1rem' }}>
            <CTAButton href="/about">Zur Über-uns-Seite</CTAButton>
          </div>
        </Card>
      </SectionWrapper>
    </>
  );
}
