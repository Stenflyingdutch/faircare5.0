'use client';

import type { Responsibility, ResponsibilityPriority } from '@/services/responsibilities.service';
import { categoryLabelMap } from '@/services/resultCalculator';

interface ResponsibilityCardDetailsProps {
  responsibility: Responsibility;
  mode: 'start' | 'assign';
  isExpanded: boolean;
  onClose: () => void;
  onSave?: (title: string, note: string) => Promise<void>;
  onDelete?: () => void;
  statusColor?: string;
}

const priorityLabels: Record<ResponsibilityPriority, string> = {
  act: 'Angehen',
  plan: 'Planen',
  observe: 'Im Blick',
};

const priorityVisuals: Record<ResponsibilityPriority, { background: string; text: string; eyebrow: string }> = {
  observe: {
    background: 'linear-gradient(180deg, #dcebea 0%, #cfe4e2 100%)',
    text: 'var(--color-text-primary)',
    eyebrow: 'var(--color-text-secondary)',
  },
  plan: {
    background: 'linear-gradient(180deg, #bfdcda 0%, #a8cfcb 100%)',
    text: 'var(--color-text-primary)',
    eyebrow: '#315c59',
  },
  act: {
    background: 'linear-gradient(180deg, #7ea9a6 0%, #5f8f8b 100%)',
    text: '#ffffff',
    eyebrow: 'rgba(255,255,255,0.82)',
  },
};

export function ResponsibilityCardDetails({
  responsibility,
  mode,
  isExpanded,
  onClose,
}: ResponsibilityCardDetailsProps) {
  if (!isExpanded) return null;

  const categoryLabel = categoryLabelMap[responsibility.categoryKey] || responsibility.categoryKey;
  const popupVisual = priorityVisuals[responsibility.priority];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 28, 36, 0.32)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '20px',
        animation: 'fadeInDetails 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: popupVisual.background,
          borderRadius: '28px',
          padding: '32px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(22, 28, 37, 0.18)',
          animation: 'scaleInDetails 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text-primary)',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: popupVisual.eyebrow }}>
            {categoryLabel}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: popupVisual.eyebrow, fontWeight: 500 }}>
            {mode === 'start' ? `Status: ${priorityLabels[responsibility.priority]}` : 'Details'}
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Titel
          </label>
          <div
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '14px',
              border: mode === 'start' && responsibility.priority === 'act' ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(47, 111, 109, 0.12)',
              backgroundColor: mode === 'start' && responsibility.priority === 'act' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)',
              color: popupVisual.text,
              fontSize: '15px',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          >
            {responsibility.title}
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Details
          </label>
          <div
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '14px',
              border: mode === 'start' && responsibility.priority === 'act' ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(47, 111, 109, 0.12)',
              backgroundColor: mode === 'start' && responsibility.priority === 'act' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)',
              color: popupVisual.text,
              fontSize: '15px',
              lineHeight: 1.65,
              minHeight: '120px',
              whiteSpace: 'pre-wrap',
              boxSizing: 'border-box',
            }}
          >
            {responsibility.note || 'Keine weiteren Details hinterlegt.'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 20px',
              borderRadius: '16px',
              border: mode === 'start' && responsibility.priority === 'act' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(47, 111, 109, 0.16)',
              backgroundColor: mode === 'start' && responsibility.priority === 'act' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
              color: popupVisual.text,
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Schließen
          </button>
        </div>

        <style>{`
          @keyframes fadeInDetails {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleInDetails {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
