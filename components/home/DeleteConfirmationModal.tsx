'use client';

import { useState } from 'react';

import { Modal } from '@/components/Modal';

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
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      ariaLabel="Löschen bestätigen"
      panelClassName="app-modal-panel--sheet delete-confirmation-sheet"
      hideCloseButton
    >
      <div className="delete-confirmation-shell">
        <div className="delete-confirmation-header">
          <h2 className="delete-confirmation-title">
            Bist du sicher?
          </h2>
          <p className="delete-confirmation-copy">
            Möchtest du die Verantwortung &bdquo;{title}&ldquo; wirklich löschen?
          </p>
        </div>

        <p className="delete-confirmation-note">
          Dieser Vorgang kann nicht rückgängig gemacht werden.
        </p>

        <div className="delete-confirmation-actions">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="delete-confirmation-button delete-confirmation-button--danger"
          >
            {isLoading ? 'Wird gelöscht…' : 'Löschen'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="delete-confirmation-button delete-confirmation-button--secondary"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </Modal>
  );
}
