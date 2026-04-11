import { StatusChip } from './StatusChip';

interface CategoryOverviewCardProps {
  id: string;
  title: string;
  previewText: string;
  status: 'unassigned' | 'in_clarification' | 'assigned';
  details?: string[];
  isExpanded?: boolean;
  onTap: () => void;
}

export function CategoryOverviewCard({ title, previewText, status, details = [], isExpanded = false, onTap }: CategoryOverviewCardProps) {
  const cardBackground = status === 'in_clarification' ? '#FAF8FF' : status === 'assigned' ? '#F7FBFB' : 'var(--color-surface)';
  const accentColor = status === 'in_clarification' ? 'var(--color-partner-primary)' : status === 'assigned' ? 'var(--color-user-primary)' : 'transparent';
  const chevron = isExpanded ? '⌃' : '⌄';

  return (
    <div
      className="category-card"
      style={{
        backgroundColor: cardBackground,
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-16)',
        boxShadow: 'var(--shadow-card)',
        minHeight: '96px',
        cursor: 'pointer',
        borderTop: `2px solid ${accentColor}`,
      }}
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      aria-label={`Verantwortungsbereich ${title}. Status ${status === 'unassigned' ? 'noch nicht zugeordnet' : status === 'in_clarification' ? 'in Klärung' : 'zugeordnet'}. Enthält Vorschau ${previewText}.`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
        <h3 className="h2" style={{ margin: 0, flex: 1 }}>{title}</h3>
        <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
          <StatusChip status={status} />
          <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)' }}>{chevron}</span>
        </div>
      </div>
      <p className="caption" style={{ margin: 0, color: 'var(--color-text-secondary)', overflow: 'visible', whiteSpace: 'normal', wordBreak: 'break-word' }}>
        {previewText}
      </p>
      {isExpanded && details.length > 0 ? (
        <div style={{ marginTop: 'var(--space-12)' }}>
          <div style={{ height: '1px', backgroundColor: 'var(--color-border-soft)', margin: 'var(--space-12) 0' }} />
          <div style={{ display: 'grid', gap: 'var(--space-8)' }}>
            {details.map((detail) => (
              <p key={detail} className="body" style={{ margin: 0, color: 'var(--color-text-primary)' }}>
                • {detail}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
