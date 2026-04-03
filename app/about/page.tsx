import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function AboutPage() {
  return (
    <>
      <PageHero
        badge="Über uns"
        title="Wir sind Nata und Sander"
        subtitle="Gründer von mental carefair – und Eltern von Liam (11 Monate)."
      />
      <SectionWrapper>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: '1.05rem' }}>
          Wir haben mental carefair gegründet, weil wir selbst erlebt haben, wie schnell Mental Load in Familien
          unsichtbar und ungleich verteilt wird. Zwischen Alltag, Job und Baby blieb oft zu wenig Raum für klare
          Gespräche darüber, wer was im Kopf behält und organisiert.
        </p>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: '1.05rem' }}>
          Mit mental carefair wollen wir ein Werkzeug schaffen, das ehrlich, alltagstauglich und respektvoll
          unterstützt: erst sichtbar machen, dann gemeinsam vereinbaren, was sich fair anfühlt.
        </p>
      </SectionWrapper>
    </>
  );
}
