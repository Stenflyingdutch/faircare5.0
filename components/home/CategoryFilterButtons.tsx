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
    <div className="home-filter-row">
      {items.map((item) => {
        const isActive = activeCategory === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={`home-filter-chip ${isActive ? 'is-active' : ''}`}
            aria-pressed={isActive}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
