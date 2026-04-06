import { useState } from 'react';
import type { Responsibility, ResponsibilityPriority, ResponsibilityOwner } from '@/services/responsibilities.service';
import { categoryLabelMap } from '@/services/resultCalculator';

interface ResponsibilityCardProps {
  responsibility: Responsibility;
  mode: 'start' | 'assign';
  onExpandDetails?: () => void;
  onPriorityChange?: (priority: ResponsibilityPriority) => void;
  onAssignmentChange?: (assignedTo: ResponsibilityOwner) => void;
}

type PriorityType = 'act' | 'plan' | 'observe';

// Extended color config for both modes
const priorityConfig: Record<PriorityType, { label: string; lightBg: string; text: string }> = {
  observe: {
    label: 'Im Blick',
    lightBg: 'var(--color-user-soft)',
    text: 'var(--color-text-primary)',
  },
  plan: {
    label: 'Planen',
    lightBg: '#A9D1CE',
    text: 'var(--color-text-primary)',
  },
  act: {
    label: 'Angehen',
    lightBg: 'var(--color-user-primary)',
    text: '#FFFFFF',
  },
};

const priorityCycle: PriorityType[] = ['observe', 'plan', 'act'];

/**
 * Unified ResponsibilityCard for Start and Assign modes
 * Compact, clean design with interactive status/assignment click
 * Assign mode: assignment visibility controlled via color only, no text labels
 */
export function ResponsibilityCard({
  responsibility,
  mode,
  onExpandDetails,
  onPriorityChange,
  onAssignmentChange,
}: ResponsibilityCardProps) {
  const categoryLabel = categoryLabelMap[responsibility.categoryKey] || responsibility.categoryKey;
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (mode === 'start' && onPriorityChange) {
        const currentIndex = priorityCycle.indexOf(responsibility.priority);
        const nextPriority = priorityCycle[(currentIndex + 1) % priorityCycle.length];
        onPriorityChange(nextPriority);
      } else if (mode === 'assign' && onAssignmentChange) {
        const currentAssignee = responsibility.assignedTo;
        let nextAssignee: ResponsibilityOwner;

        if (currentAssignee === 'user') {
          nextAssignee = 'partner';
        } else if (currentAssignee === 'partner') {
          nextAssignee = 'user';
        } else {
          nextAssignee = 'user';
        }
        onAssignmentChange(nextAssignee);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getCardBackgroundColor = (): string => {
    if (mode === 'start') {
      return priorityConfig[responsibility.priority].lightBg;
    } else {
      // assign mode: vary by assignee
      if (responsibility.assignedTo === 'user') {
        return priorityConfig.act.lightBg;
      } else if (responsibility.assignedTo === 'partner') {
        return 'var(--color-partner-primary)';
      }
      return 'var(--color-surface)'; // unassigned: neutral
    }
  };

  // Only calculate priority label for Start mode - never calculate assignment labels
  const priorityLabel = mode === 'start' ? priorityConfig[responsibility.priority].label : undefined;

  const bgColor = getCardBackgroundColor();
  const textColor = mode === 'start' ? priorityConfig[responsibility.priority].text : '#FFFFFF';

  return (
    <div
      style={{
        background: bgColor,
        borderRadius: '24px',
        padding: '20px',
        border: '1px solid var(--color-border-soft)',
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Header: Category + Title (clickable for details) */}
      <div
        onClick={onExpandDetails}
        style={{ cursor: onExpandDetails ? 'pointer' : 'default' }}
        role={onExpandDetails ? 'button' : undefined}
        tabIndex={onExpandDetails ? 0 : undefined}
        onKeyDown={(e) => {
          if (onExpandDetails && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onExpandDetails();
          }
        }}
      >
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: textColor, opacity: 0.9 }}>
          {categoryLabel}
        </p>
        <h3 style={{ margin: '12px 0 0 0', fontSize: '20px', lineHeight: 1.2, fontWeight: 600, color: textColor }}>
          {responsibility.title}
        </h3>
      </div>

      {/* Separator + Status: Only in Start mode for priority label. In Assign mode, completely clean. */}
      {mode === 'start' && (
        <>
          <div style={{ margin: '18px 0 16px', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)', opacity: textColor === '#FFFFFF' ? 1 : 0.3 }} />

          <div
            onClick={handleStatusClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStatusClick();
              }
            }}
            style={{
              cursor: 'pointer',
              display: 'inline-block',
              padding: '4px 0',
              fontSize: '13px',
              fontWeight: 700,
              color: textColor,
              opacity: textColor === '#FFFFFF' ? 0.95 : 0.8,
              textDecoration: 'underline',
              textDecorationColor: 'currentColor',
              textDecorationThickness: '1px',
              textUnderlineOffset: '4px',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = textColor === '#FFFFFF' ? '1' : '1';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = textColor === '#FFFFFF' ? '0.95' : '0.8';
            }}
          >
            {priorityLabel}
          </div>
        </>
      )}
    </div>
  );
}
