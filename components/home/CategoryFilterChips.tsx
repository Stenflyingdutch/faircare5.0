import { categoryLabelMap } from '@/services/resultCalculator';
import type { QuizCategory } from '@/types/quiz';

interface CategoryFilterChipsProps {
  categories: QuizCategory[];
  activeCategory: QuizCategory | 'all' | null;
  onSelect: (category: QuizCategory | 'all') => void;
}

export function CategoryFilterChips({ categories, activeCategory, onSelect }: CategoryFilterChipsProps) {
  if (categories.length === 1) {
    // Wenn nur eine Kategorie, Filter ausblenden
    return null;
  }

  const items: Array<{ label: string; value: QuizCategory | 'all' }> = [
    { label: 'Alle', value: 'all' },
    ...categories.map((cat) => ({
      label: categoryLabelMap[cat] || cat,
      value: cat,
    })),
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
      {items.map((item) => {
        const isActive = activeCategory === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              backgroundColor: isActive ? 'var(--color-user-primary)' : 'var(--color-border-soft)',
              color: isActive ? '#FFFFFF' : 'var(--color-text-primary)',
            }}
            aria-pressed={isActive}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
