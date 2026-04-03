import { PageHero } from '@/components/PageHero';
import { SectionWrapper } from '@/components/SectionWrapper';

export default function NewsletterPage() {
  return (
    <>
      <PageHero
        badge="Newsletter"
        title="Bleib auf dem Laufenden"
        subtitle="Melde dich an und erhalte Produkt-Updates, neue Inhalte und praktische Impulse rund um Mental Load in Familien."
      />
      <SectionWrapper>
        <form style={{ maxWidth: 560, display: 'grid', gap: '0.75rem' }}>
          <label htmlFor="email" style={{ fontWeight: 600 }}>
            E-Mail-Adresse
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="du@beispiel.de"
            style={{ border: '1px solid var(--color-line)', borderRadius: 12, padding: '0.85rem' }}
          />
          <button
            type="submit"
            style={{
              border: 0,
              borderRadius: 999,
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 600,
              padding: '0.85rem 1.2rem',
              width: 'fit-content',
            }}
          >
            Zum Newsletter anmelden
          </button>
          <small style={{ color: 'var(--color-text-secondary)' }}>
            Hinweis: Die technische Speicherung wird in einer späteren Etappe finalisiert.
          </small>
        </form>
      </SectionWrapper>
    </>
  );
}
