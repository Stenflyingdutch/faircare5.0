import { Card } from '@/components/Card';
import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function LoginPage() {
  return (
    <>
      <PageHero
        badge="Login (Platzhalter)"
        title="Willkommen zurück"
        subtitle="Hier kannst du dich später einloggen und dein eigenes sowie euer gemeinsames Ergebnis einsehen."
      />
      <SectionWrapper>
        <div style={{ maxWidth: 480 }}>
          <Card title="Login-Bereich" description="Authentifizierung mit Firebase Auth wird in den nächsten Etappen angebunden.">
            <form style={{ display: 'grid', gap: '0.5rem' }}>
              <input type="email" placeholder="E-Mail" style={{ border: '1px solid var(--color-line)', borderRadius: 10, padding: '0.75rem' }} />
              <input type="password" placeholder="Passwort" style={{ border: '1px solid var(--color-line)', borderRadius: 10, padding: '0.75rem' }} />
              <button type="button" style={{ border: 0, background: 'var(--color-primary)', color: '#fff', borderRadius: 999, padding: '0.7rem 1rem' }}>
                Anmelden (bald verfügbar)
              </button>
            </form>
          </Card>
        </div>
      </SectionWrapper>
    </>
  );
}
