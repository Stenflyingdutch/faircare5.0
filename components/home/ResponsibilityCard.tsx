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
const priorityConfig: Record<PriorityType, { label: string; lightBg: string; text: string; divider: string; cta: string; border: string }> = {
  observe: {
    label: 'Im Blick',
    lightBg: 'linear-gradient(180deg, #eef7f6 0%, #dcebea 52%, #c9e0de 100%)',
    text: 'var(--color-text-primary)',
    divider: 'rgba(47, 111, 109, 0.18)',
    cta: 'var(--color-text-secondary)',
    border: 'rgba(178, 207, 203, 0.95)',
  },
  plan: {
    label: 'Planen',
    lightBg: 'linear-gradient(180deg, #dcefed 0%, #bfdcda 50%, #9fc9c5 100%)',
    text: 'var(--color-text-primary)',
    divider: 'rgba(47, 111, 109, 0.24)',
    cta: '#315c59',
    border: 'rgba(143, 190, 184, 0.96)',
  },
  act: {
    label: 'Angehen',
    lightBg: 'linear-gradient(180deg, #9bbab7 0%, #7ea9a6 48%, #567f7c 100%)',
    text: '#FFFFFF',
    divider: 'rgba(255, 255, 255, 0.28)',
    cta: '#f4fbfb',
    border: 'rgba(88, 128, 124, 0.96)',
  },
};

const priorityCycle: PriorityType[] = ['observe', 'plan', 'act'];

function assignVisual(assignedTo: ResponsibilityOwner) {
  if (assignedTo === 'user') {
    return {
      label: 'Du',
      background: 'linear-gradient(180deg, #dcebea 0%, #cfe4e2 100%)',
      text: 'var(--color-text-primary)',
      divider: 'rgba(47, 111, 109, 0.18)',
      cta: '#2f5553',
      border: 'rgba(154, 201, 196, 0.95)',
    };
  }

  if (assignedTo === 'partner') {
    return {
      label: 'Partner',
      background: 'linear-gradient(180deg, #ece7ff 0%, #e2dafd 100%)',
      text: 'var(--color-text-primary)',
      divider: 'rgba(124, 92, 250, 0.18)',
      cta: '#5e4ac8',
      border: 'rgba(192, 176, 247, 0.95)',
    };
  }

  return {
    label: 'Noch nicht zugeordnet',
    background: 'linear-gradient(180deg, #f6f3ed 0%, #efe8dc 100%)',
    text: 'var(--color-text-primary)',
    divider: 'rgba(91, 101, 112, 0.14)',
    cta: '#5b6570',
    border: 'rgba(217, 206, 188, 0.95)',
  };
}

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
    }
    return assignVisual(responsibility.assignedTo).background;
  };

  const priorityLabel = mode === 'start' ? priorityConfig[responsibility.priority].label : undefined;
  const assignmentVisual = assignVisual(responsibility.assignedTo);

  const bgColor = getCardBackgroundColor();
  const textColor = mode === 'start' ? priorityConfig[responsibility.priority].text : assignmentVisual.text;
  const ctaLabel = mode === 'start' ? priorityLabel : assignmentVisual.label;
  const ctaColor = mode === 'start' ? priorityConfig[responsibility.priority].cta : assignmentVisual.cta;
  const dividerColor = mode === 'start' ? priorityConfig[responsibility.priority].divider : assignmentVisual.divider;
  const borderColor = mode === 'start' ? priorityConfig[responsibility.priority].border : assignmentVisual.border;

  return (
    <div
      style={{
        background: bgColor,
        borderRadius: '24px',
        padding: '20px',
        border: `1px solid ${borderColor}`,
        borderLeft: `6px solid ${borderColor}`,
        boxShadow: 'var(--shadow-card)',
        transition: 'background 0.3s ease, box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
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
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: mode === 'start' && responsibility.priority === 'act' ? 'rgba(255,255,255,0.84)' : 'var(--color-text-secondary)', opacity: 0.95 }}>
          {categoryLabel}
        </p>
        <h3 style={{ margin: '12px 0 0 0', fontSize: '20px', lineHeight: 1.2, fontWeight: 600, color: textColor }}>
          {responsibility.title}
        </h3>
      </div>

      <div style={{ margin: '18px 0 14px', height: '1px', backgroundColor: dividerColor }} />

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
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minHeight: '42px',
          padding: '2px 0 0',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: ctaColor,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '0.88';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '1';
        }}
      >
        {ctaLabel}
      </div>
    </div>
  );
}
