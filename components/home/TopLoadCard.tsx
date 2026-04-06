interface TopLoadCardProps {
  category: string;
}

export function TopLoadCard({ category }: TopLoadCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-muted)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-20)',
        marginBottom: 'var(--space-16)',
      }}
    >
      <p className="caption" style={{ margin: '0 0 var(--space-8) 0', color: 'var(--color-text-secondary)' }}>
        Dein aktuell größter Bereich
      </p>
      <h2 className="h2" style={{ margin: '0 0 var(--space-4) 0' }}>{category}</h2>
      <p className="body" style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
        Hier trägst du aktuell am meisten Verantwortung.
      </p>
    </div>
  );
}