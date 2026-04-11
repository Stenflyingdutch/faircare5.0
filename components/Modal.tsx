import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div className="app-modal-panel" onClick={(e) => e.stopPropagation()}>
        {children}
        <button
          onClick={onClose}
          className="app-modal-close"
          aria-label="Schließen"
        >
          ×
        </button>
      </div>
    </div>
  );
}
