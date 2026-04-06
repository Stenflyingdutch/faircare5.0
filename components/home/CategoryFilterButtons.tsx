import { categoryLabelMap } from '@/services/resultCalculator';
import type { QuizCategory } from '@/types/quiz';

interface CategoryFilterButtonsProps {
  categories: QuizCategory[];
  activeCategory: QuizCategory | 'all' | null;
  onSelect: (category: QuizCategory | 'all') => void;
}

export function CategoryFilterButtons({ categories, activeCategory, onSelect }: CategoryFilterButtonsProps) {
  if (categories.length <= 1) {
    return null;
  }

  const items: Array<{ label: string; value: QuizCategory | 'all' }> = [
    { label: 'Alle', value: 'all' },
    ...categories.map((category) => ({
      label: categoryLabelMap[category] || category,
      value: category,
    })),
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
      {items.map((item) => {
        const isActive = activeCategory === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            style={{
              minHeight: '44px',
              padding: '10px 16px',
              borderRadius: '999px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.2s ease, color 0.2s ease',
              backgroundColor: isActive ? 'var(--color-user-primary)' : 'var(--color-neutral-soft)',
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
