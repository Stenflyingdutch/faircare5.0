interface SortToggleProps {
  sortMode: 'relevance' | 'area';
  onChange: (mode: 'relevance' | 'area') => void;
}

const labels = {
  relevance: 'Relevanz',
  area: 'Bereich',
};

export function SortToggle({ sortMode, onChange }: SortToggleProps) {
  return (
    <div style={{ display: 'inline-flex', gap: '8px', padding: '6px', background: 'var(--color-surface)', borderRadius: '999px', border: '1px solid var(--color-border-soft)' }}>
      {(['relevance', 'area'] as const).map((mode) => {
        const isActive = sortMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            style={{
              padding: '10px 14px',
              borderRadius: '999px',
              border: 'none',
              minWidth: '90px',
              backgroundColor: isActive ? 'var(--color-user-primary)' : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--color-text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            aria-pressed={isActive}
          >
            {labels[mode]}
          </button>
        );
      })}
    </div>
  );
}
