'use client';

import { useState } from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * Beautiful, ruhiger Bestätigungsdialog für Löschen-Aktionen
 * Elegantes Modal mit hochwertiger Typografie und sanften Animationen
 */
export function DeleteConfirmationModal({ isOpen, title = 'Verantwortung', onConfirm, onCancel }: DeleteConfirmationModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onCancel}
    >
      {/* Bottom Sheet Modal */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '32px 32px 0 0',
          padding: '32px 20px 28px',
          maxWidth: '100%',
          width: '100%',
          maxHeight: '80vh',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Bist du sicher?
          </h2>
          <p style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            Möchtest du die Verantwortung „{title}“ wirklich löschen?
          </p>
        </div>

        {/* Note */}
        <p style={{ margin: '0 0 28px 0', fontSize: '13px', color: 'var(--color-text-secondary)', opacity: 0.7, lineHeight: 1.4 }}>
          Dieser Vorgang kann nicht rückgängig gemacht werden.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          {/* Delete Button - Primary but not aggressive */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              padding: '14px 20px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'opacity 0.2s ease, background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#B91C1C';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#DC2626';
            }}
          >
            {isLoading ? 'Wird gelöscht…' : 'Löschen'}
          </button>

          {/* Cancel Button - Secondary, default action */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '14px 20px',
              borderRadius: '16px',
              border: '1px solid var(--color-border-soft)',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'opacity 0.2s ease, background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-surface)';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-background)';
            }}
          >
            Abbrechen
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
