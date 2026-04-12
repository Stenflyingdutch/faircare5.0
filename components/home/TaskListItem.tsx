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

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.2 2.4a.5.5 0 0 1-.8-.4v-2H4.5A1.5 1.5 0 0 1 3 12V6a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  );
}

export function TaskListItem({
  currentUserId,
  task,
  selectedDate,
  onEdit,
  onChat,
  onReclaimDelegation,
  onToggleStatus,
  onSwipeRight,
  onSwipeLeft,
  hasUnreadMessage = false,
}: {
  currentUserId: string | null;
  task: TaskOverviewItem;
  selectedDate: string;
  onEdit: () => void;
  onChat?: () => void;
  onReclaimDelegation?: () => void;
  onToggleStatus?: () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  hasUnreadMessage?: boolean;
}) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const skipClickRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isAssignedToCurrentUser = Boolean(currentUserId) && task.delegatedToUserId === currentUserId;
  const isDelegatedAwayFromCurrentUser = Boolean(currentUserId) && Boolean(task.delegatedToUserId) && !isAssignedToCurrentUser;
  const canEditTask = Boolean(currentUserId) && (
    task.delegatedToUserId
      ? task.delegatedToUserId === currentUserId
      : (task.creatorUserId ?? task.createdByUserId) === currentUserId
  );
  const canToggleStatus = (task.recurrenceType === 'none'
    ? task.selectedDate === selectedDate
    : task.isDueOnSelectedDate) && canEditTask;
  const canRequestDelegationReclaim = isDelegatedAwayFromCurrentUser && Boolean(onReclaimDelegation);
  const isDelegatedByCurrentUser = Boolean(currentUserId)
    && Boolean(task.delegatedToUserId)
    && (task.creatorUserId ?? task.createdByUserId) === currentUserId;
  const swipeLeftLabel = isDelegatedByCurrentUser ? 'Zurücknehmen' : 'Delegieren';
  const chips: Array<{ key: string; label: string; variant?: 'delegated' | 'new' | 'series' }> = [];

  if (task.recurrenceType !== 'none') {
    chips.push({
      key: 'series',
      label: getTaskTimingLabel(task),
      variant: 'series',
    });
  }

  if (task.delegatedToUserId) {
    chips.push({ key: 'delegated', label: isAssignedToCurrentUser ? 'Zugewiesen' : 'Delegiert', variant: 'delegated' });
  }
  if (hasUnreadMessage) {
    chips.push({ key: 'new', label: 'Ungelesen', variant: 'new' });
  }

  const handleRowClick = () => {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }

    if (canToggleStatus) {
      onToggleStatus?.();
      return;
    }

    if (canRequestDelegationReclaim) {
      onReclaimDelegation?.();
    }
  };

  const isInteractive = canToggleStatus || canRequestDelegationReclaim;

  const swipeIntensity = Math.min(Math.abs(swipeOffset) / 120, 1);

  return (
    <div className="task-swipe-shell">
      <div className="task-swipe-actions" aria-hidden="true">
        <div className={`task-swipe-action is-delete ${swipeOffset > 0 ? 'is-active' : ''}`} style={{ opacity: swipeOffset > 0 ? 0.35 + swipeIntensity * 0.65 : 0 }}>
          Löschen
        </div>
        <div className={`task-swipe-action is-delegate ${swipeOffset < 0 ? 'is-active' : ''}`} style={{ opacity: swipeOffset < 0 ? 0.35 + swipeIntensity * 0.65 : 0 }}>
          {swipeLeftLabel}
        </div>
      </div>

      <div
        className={`task-list-item ${isInteractive ? 'is-clickable' : ''} ${task.isCompleted ? 'is-completed' : ''} ${isDelegatedAwayFromCurrentUser ? 'is-delegated' : ''}`}
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
            <span
              key={`${task.id}-${chip.key}`}
              className={`task-chip ${chip.variant === 'delegated' ? 'is-delegated' : ''} ${chip.variant === 'new' ? 'is-chat-new' : ''} ${chip.variant === 'series' ? 'is-series' : ''}`}
            >
              {chip.label}
            </span>
          ))}
        </div>

        <div className="task-row-action-stack">
          {canEditTask ? (
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
          ) : null}
          {onChat ? (
            <button
              type="button"
              className="task-row-icon-button task-row-chat-button"
              aria-label={`Nachricht zu ${task.displayTitle} senden`}
              onClick={(event) => {
                event.stopPropagation();
                onChat();
              }}
            >
              <ChatBubbleIcon />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
