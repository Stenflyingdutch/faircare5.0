interface DistributionCardProps {
  userPercent: number;
  partnerPercent: number;
}

export function DistributionCard({ userPercent, partnerPercent }: DistributionCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-20)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: 'var(--space-16)',
      }}
    >
      <h2 className="h2" style={{ margin: '0 0 var(--space-8) 0' }}>Aktuelle Verteilung</h2>
      <p className="caption" style={{ margin: '0 0 var(--space-16) 0', color: 'var(--color-text-secondary)' }}>
        Die Verteilung ist eine Momentaufnahme. Entscheidend ist, ob ihr zufrieden seid.
      </p>
      <div
        style={{
          height: '16px',
          width: '100%',
          borderRadius: 'var(--radius-pill)',
          background: `linear-gradient(to right, var(--color-user-primary) ${userPercent}%, var(--color-partner-primary) ${userPercent}%)`,
          marginBottom: 'var(--space-12)',
        }}
        aria-label={`Aktuelle Verteilung. Du ${userPercent} Prozent. Partner ${partnerPercent} Prozent.`}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="body" style={{ fontWeight: 600 }}>Du {userPercent}%</span>
        <span className="body" style={{ fontWeight: 600 }}>Partner {partnerPercent}%</span>
      </div>
    </div>
  );
}