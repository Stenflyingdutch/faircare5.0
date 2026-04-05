import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function NewsletterPage() {
  return (
    <>
      <PageHero
        badge="Newsletter"
        title="Bleib auf dem Laufenden"
        subtitle="Erhalte in kurzen Abständen hilfreiche Impulse, neue Inhalte und Updates zu FairCare."
      />
      <SectionWrapper>
        <form className="form-shell">
          <label htmlFor="email" style={{ fontWeight: 600 }}>
            E-Mail-Adresse
          </label>
          <input id="email" name="email" type="email" placeholder="du@beispiel.de" className="input" />
          <button type="submit" className="button primary" style={{ width: 'fit-content' }}>
            Zum Newsletter anmelden
          </button>
          <small className="helper">Wir informieren dich, sobald die Anmeldung vollständig aktiv ist.</small>
        </form>
      </SectionWrapper>
    </>
  );
}
