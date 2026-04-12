import { useRef, useState } from 'react';

import { getTaskTimingLabel } from '@/services/tasks.logic';
import type { TaskOverviewItem } from '@/types/tasks';

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14.5 3.5 2 2" />
      <path d="M4 13.9V16h2.1L15 7.1 12.9 5z" />
    </svg>
  );
}

export function TaskListItem({
  task,
  selectedDate,
  onEdit,
  onToggleStatus,
  onSwipeRight,
  onSwipeLeft,
}: {
  task: TaskOverviewItem;
  selectedDate: string;
  onEdit: () => void;
  onToggleStatus?: () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
}) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const skipClickRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const canToggleStatus = !task.isDelegated && (task.recurrenceType === 'none'
    ? task.selectedDate === selectedDate
    : task.isDueOnSelectedDate);
  const chips = [getTaskTimingLabel(task)];

  if (task.isDelegated) {
    chips.push('Delegiert');
  }

  const handleRowClick = () => {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }

    if (task.isDelegated) {
      onEdit();
      return;
    }

    if (canToggleStatus) {
      onToggleStatus?.();
    }
  };

  const isInteractive = task.isDelegated || canToggleStatus;

  const swipeIntensity = Math.min(Math.abs(swipeOffset) / 120, 1);

  return (
    <div className="task-swipe-shell">
      <div className="task-swipe-actions" aria-hidden="true">
        <div className={`task-swipe-action is-delete ${swipeOffset > 0 ? 'is-active' : ''}`} style={{ opacity: swipeOffset > 0 ? 0.35 + swipeIntensity * 0.65 : 0 }}>
          Löschen
        </div>
        <div className={`task-swipe-action is-delegate ${swipeOffset < 0 ? 'is-active' : ''}`} style={{ opacity: swipeOffset < 0 ? 0.35 + swipeIntensity * 0.65 : 0 }}>
          Delegieren
        </div>
      </div>

      <div
        className={`task-list-item ${isInteractive ? 'is-clickable' : ''} ${task.isCompleted ? 'is-completed' : ''} ${task.isDelegated ? 'is-delegated' : ''}`}
        style={swipeOffset === 0 ? undefined : { transform: `translateX(${swipeOffset}px)` }}
        onClick={isInteractive ? handleRowClick : undefined}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={isInteractive ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleRowClick();
          }
        } : undefined}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          setSwipeOffset(0);
        }}
        onTouchMove={(event) => {
          if (!touchStartRef.current) return;
          const touch = event.touches[0];
          const deltaX = touch.clientX - touchStartRef.current.x;
          const deltaY = touch.clientY - touchStartRef.current.y;
          if (Math.abs(deltaY) > Math.abs(deltaX)) return;

          const clampedOffset = Math.max(-132, Math.min(132, deltaX));
          setSwipeOffset(clampedOffset);
          if (Math.abs(clampedOffset) > 10) {
            skipClickRef.current = true;
          }
        }}
        onTouchEnd={(event) => {
          if (!touchStartRef.current) return;
          const touch = event.changedTouches[0];
          const deltaX = touch.clientX - touchStartRef.current.x;
          const deltaY = touch.clientY - touchStartRef.current.y;
          touchStartRef.current = null;

          if (Math.abs(deltaY) > 50 || Math.abs(deltaX) < 70) {
            setSwipeOffset(0);
            return;
          }

          skipClickRef.current = true;
          setSwipeOffset(0);
          if (deltaX > 0) {
            onSwipeRight?.();
            return;
          }
          onSwipeLeft?.();
        }}
        onTouchCancel={() => {
          touchStartRef.current = null;
          setSwipeOffset(0);
        }}
      >
        <div className="task-row-copy">
          <strong className={`task-row-title ${task.isCompleted ? 'is-completed' : ''}`}>
            {task.displayTitle}
          </strong>
          {task.displayNotes ? <span className="task-row-note">{task.displayNotes}</span> : null}
        </div>

        <div className="task-chip-row">
          {chips.map((chip) => (
            <span key={`${task.id}-${chip}`} className={`task-chip ${chip === 'Delegiert' ? 'is-delegated' : ''}`}>{chip}</span>
          ))}
        </div>

        <button
          type="button"
          className="task-row-icon-button"
          aria-label={`Aufgabe ${task.displayTitle} bearbeiten`}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <PencilIcon />
        </button>
      </div>
    </div>
  );
}
