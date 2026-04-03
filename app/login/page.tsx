import { Card } from '@/components/Card';
import { CTAButton } from '@/components/CTAButton';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function LoginPage() {
  return (
    <>
      <PageHero
        badge="Login"
        title="Willkommen zurück"
        subtitle="Hier kannst du dich künftig anmelden, um eure Übersicht und den gemeinsamen Fortschritt zu sehen."
      />
      <SectionWrapper>
        <div style={{ width: 'min(480px, 100%)' }}>
          <Card title="Login-Bereich" description="Die Anmeldung wird in den nächsten Schritten technisch angebunden.">
            <form className="form-shell" style={{ marginTop: '1rem' }}>
              <input type="email" placeholder="E-Mail" className="input" />
              <input type="password" placeholder="Passwort" className="input" />
              <CTAButton href="/test">Zum Test starten</CTAButton>
            </form>
          </Card>
        </div>
      </SectionWrapper>
    </>
  );
}
