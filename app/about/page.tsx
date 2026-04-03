import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function AboutPage() {
  return (
    <>
      <PageHero
        badge="Über uns"
        title="Wir sind Nata und Sander"
        subtitle="Als Eltern wissen wir, wie schnell Mental Load unsichtbar wird – genau deshalb haben wir mental carefair gestartet."
      />
      <SectionWrapper>
        <div className="stack">
          <p className="text-block">
            Wir haben mental carefair gegründet, weil wir selbst erlebt haben, wie schnell Verantwortung in Familien unausgesprochen bei einer Person landet. Zwischen Alltag, Job und Kind fehlt oft die Zeit, darüber ruhig zu sprechen.
          </p>
          <p className="text-block">
            Unser Ziel ist ein Werkzeug, das klar, respektvoll und alltagstauglich unterstützt: zuerst sichtbar machen, dann gemeinsam entscheiden, was sich für euch fair anfühlt.
          </p>
        </div>
      </SectionWrapper>
    </>
  );
}
