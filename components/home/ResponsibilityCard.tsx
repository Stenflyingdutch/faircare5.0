import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { Responsibility, ResponsibilityPriority } from '@/services/responsibilities.service';
import { categoryLabelMap } from '@/services/resultCalculator';

interface ResponsibilityCardProps {
  responsibility: Responsibility;
  onTap?: () => void;
  onPriorityTap?: (newPriority: ResponsibilityPriority) => void;
}

const priorityConfig: Record<ResponsibilityPriority, { label: string; bg: string; border: string; text: string; detailBg: string }> = {
  observe: {
    label: 'Im Blick',
    bg: '#E8F3F2',
    border: '#C1D7D2',
    text: '#1F4A47',
    detailBg: 'rgba(255, 255, 255, 0.72)',
  },
  plan: {
    label: 'Planen',
    bg: '#7DB0A8',
    border: '#5A8E84',
    text: '#082F2C',
    detailBg: 'rgba(255, 255, 255, 0.14)',
  },
  act: {
    label: 'Angehen',
    bg: '#1D4B4A',
    border: '#193D3C',
    text: '#FFFFFF',
    detailBg: 'rgba(255, 255, 255, 0.1)',
  },
};

const nextPriority: Record<ResponsibilityPriority, ResponsibilityPriority> = {
  observe: 'plan',
  plan: 'act',
  act: 'observe',
};

export function ResponsibilityCard({ responsibility, onTap, onPriorityTap }: ResponsibilityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = priorityConfig[responsibility.priority];
  const categoryLabel = categoryLabelMap[responsibility.categoryKey] || responsibility.categoryKey;

  const handleHeaderClick = () => {
    setExpanded((current) => !current);
    onTap?.();
  };
  const handleFooterClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onPriorityTap?.(nextPriority[responsibility.priority]);
  };

  return (
    <div
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: responsibility.priority === 'act' ? '0 8px 24px rgba(16, 50, 49, 0.22)' : '0 4px 16px rgba(31, 72, 71, 0.14)',
        transition: 'transform 0.24s ease, box-shadow 0.24s ease',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleHeaderClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleHeaderClick();
          }
        }}
        style={{
          padding: '20px 20px 16px',
          cursor: 'pointer',
        }}
      >
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: config.text, opacity: 0.8 }}>
          {categoryLabel}
        </p>
        <h3 style={{ margin: '10px 0 0 0', fontSize: '18px', lineHeight: 1.24, color: config.text }}>
          {responsibility.title}
        </h3>
        {expanded && responsibility.note ? (
          <div
            style={{
              marginTop: '14px',
              padding: '14px',
              background: config.detailBg,
              borderRadius: '16px',
              color: config.text,
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, opacity: 0.95 }}>
              {responsibility.note}
            </p>
          </div>
        ) : null}
      </div>

      <div
        onClick={handleFooterClick}
        style={{
          borderTop: `1px solid ${config.border}`,
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          background: 'transparent',
        }}
      >
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: config.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {config.label}
        </p>
      </div>
    </div>
  );
}
