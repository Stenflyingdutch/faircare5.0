'use client';

import { useState } from 'react';
import type { Responsibility, ResponsibilityPriority } from '@/services/responsibilities.service';
import { categoryLabelMap } from '@/services/resultCalculator';

interface ResponsibilityCardDetailsProps {
  responsibility: Responsibility;
  mode: 'start' | 'assign';
  isExpanded: boolean;
  onClose: () => void;
  onSave?: (title: string, note: string) => Promise<void>;
  onDelete?: () => void;
}

const priorityLabels: Record<ResponsibilityPriority, string> = {
  act: 'Angehen',
  plan: 'Planen',
  observe: 'Im Blick',
};

/**
 * Expandable detail panel for Start mode (read-only) or Assign mode (editable)
 * Smooth expand/collapse animation
 */
export function ResponsibilityCardDetails({
  responsibility,
  mode,
  isExpanded,
  onClose,
  onSave,
  onDelete,
}: ResponsibilityCardDetailsProps) {
  const [editTitle, setEditTitle] = useState(responsibility.title);
  const [editNote, setEditNote] = useState(responsibility.note || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isExpanded) return null;

  const categoryLabel = categoryLabelMap[responsibility.categoryKey] || responsibility.categoryKey;
  const isEditable = mode === 'assign';

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(editTitle, editNote);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '20px',
        animation: 'fadeInDetails 0.2s ease',
      }}
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '28px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          animation: 'scaleInDetails 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text-primary)',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-neutral-soft)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-background)';
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
            {categoryLabel}
          </p>
          {mode === 'start' && (
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Status: {priorityLabels[responsibility.priority]}
            </p>
          )}
        </div>

        {/* Title Field */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Titel
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            disabled={!isEditable || isSaving}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--color-border-soft)',
              backgroundColor: isEditable ? 'var(--color-background)' : 'var(--color-neutral-soft)',
              color: 'var(--color-text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
              cursor: isEditable ? 'text' : 'default',
              opacity: isSaving ? 0.6 : 1,
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (isEditable) e.currentTarget.style.borderColor = 'var(--color-user-primary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-soft)';
            }}
            readOnly={!isEditable}
          />
        </div>

        {/* Details/Note Field */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Details
          </label>
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            disabled={!isEditable || isSaving}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--color-border-soft)',
              backgroundColor: isEditable ? 'var(--color-background)' : 'var(--color-neutral-soft)',
              color: 'var(--color-text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
              minHeight: '100px',
              resize: 'vertical',
              cursor: isEditable ? 'text' : 'default',
              opacity: isSaving ? 0.6 : 1,
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (isEditable) e.currentTarget.style.borderColor = 'var(--color-user-primary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-soft)';
            }}
            readOnly={!isEditable}
          />
        </div>

        {/* Action Buttons - only for assign mode */}
        {isEditable && (
          <div style={{ display: 'flex', gap: '12px', flexDirection: mode === 'assign' ? 'row' : 'column' }}>
            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: 'var(--color-user-primary)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
                transition: 'transform 0.2s ease, opacity 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSaving) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                if (!isSaving) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              {isSaving ? 'Speichern…' : 'Speichern'}
            </button>

            {/* Delete Button */}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isSaving}
                style={{
                  flex: 0.8,
                  padding: '12px 20px',
                  borderRadius: '16px',
                  border: '1px solid var(--color-border-soft)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1,
                  transition: 'background-color 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  if (!isSaving) {
                    btn.style.backgroundColor = '#FEE2E2';
                    btn.style.color = '#DC2626';
                  }
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  if (!isSaving) {
                    btn.style.backgroundColor = 'transparent';
                    btn.style.color = 'var(--color-text-secondary)';
                  }
                }}
              >
                Löschen
              </button>
            )}
          </div>
        )}

        {/* Close on Escape */}
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
