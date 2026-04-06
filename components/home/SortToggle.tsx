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
    <div className="home-sort-toggle">
      {(['relevance', 'area'] as const).map((mode) => {
        const isActive = sortMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`home-sort-toggle-button ${isActive ? 'is-active' : ''}`}
            aria-pressed={isActive}
          >
            {labels[mode]}
          </button>
        );
      })}
    </div>
  );
}
