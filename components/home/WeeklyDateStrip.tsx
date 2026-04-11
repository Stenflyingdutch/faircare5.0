'use client';

import { buildWeek, formatStripDate, formatWeekRange, formatWeekdayLabel } from '@/services/task-date';

interface WeeklyDateStripProps {
  selectedDate: string;
  visibleWeekStart: string;
  onSelectDate: (date: string) => void;
  onShiftWeek: (direction: -1 | 1) => void;
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === 'left'
        ? <path d="M15 4 7 12l8 8" />
        : <path d="m9 4 8 8-8 8" />}
    </svg>
  );
}

export function WeeklyDateStrip({
  selectedDate,
  visibleWeekStart,
  onSelectDate,
  onShiftWeek,
}: WeeklyDateStripProps) {
  const weekDates = buildWeek(visibleWeekStart);
  const weekEnd = weekDates[weekDates.length - 1];

  return (
    <section className="weekly-strip-card" aria-label="Wochenauswahl">
      <div className="weekly-strip-header">
        <button
          type="button"
          className="weekly-strip-arrow"
          onClick={() => onShiftWeek(-1)}
          aria-label="Vorherige Woche"
        >
          <ArrowIcon direction="left" />
        </button>
        <h2 className="weekly-strip-title">{formatWeekRange(visibleWeekStart, weekEnd)}</h2>
        <button
          type="button"
          className="weekly-strip-arrow"
          onClick={() => onShiftWeek(1)}
          aria-label="Nächste Woche"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>

      <div className="weekly-strip-grid">
        {weekDates.map((dateKey) => {
          const isSelected = dateKey === selectedDate;
          return (
            <button
              key={dateKey}
              type="button"
              className={`weekly-strip-day ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelectDate(dateKey)}
              aria-pressed={isSelected}
            >
              <span className="weekly-strip-date">{formatStripDate(dateKey)}</span>
              <span className="weekly-strip-circle">{formatWeekdayLabel(dateKey)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
