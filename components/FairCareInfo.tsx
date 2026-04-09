interface FairCareInfoProps {
  onClose: () => void;
}

export function FairCareInfo({ onClose }: FairCareInfoProps) {
  return (
    <div>
      <h2 className="h1" style={{ marginTop: 0, marginBottom: 'var(--space-16)' }}>
        Was ist FairCare?
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
        <div>
          <h3 className="h2" style={{ marginBottom: 'var(--space-8)' }}>
            Mental Load sichtbar machen
          </h3>
          <p className="body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            FairCare hilft euch, die unsichtbare Denk- und Planungsarbeit im Alltag greifbar zu machen.
            Mit unserem Quiz seht ihr, wie Verantwortung aktuell verteilt ist.
          </p>
        </div>

        <div>
          <h3 className="h2" style={{ marginBottom: 'var(--space-8)' }}>
            Gemeinsam reflektieren
          </h3>
          <p className="body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Besprecht die Ergebnisse ohne Bewertung. Versteht, wo jeder seine Stärken einbringt
            und wo Anpassungen sinnvoll sein könnten.
          </p>
        </div>

        <div>
          <h3 className="h2" style={{ marginBottom: 'var(--space-8)' }}>
            Klar verteilen
          </h3>
          <p className="body" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Ordnet Verantwortlichkeiten strukturiert zu und haltet die Vereinbarungen nachvollziehbar fest.
            Mit regelmäßigen Check-ins bleibt alles transparent.
          </p>
        </div>

        <div style={{
          backgroundColor: 'var(--color-surface-muted)',
          padding: 'var(--space-16)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border-soft)'
        }}>
          <p className="caption" style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            FairCare bewertet nicht. Es schafft Transparenz.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-24)', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'var(--color-user-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-button)',
            padding: 'var(--space-12) var(--space-24)',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
