import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  closeLabel?: string;
  hideCloseButton?: boolean;
  overlayClassName?: string;
  panelClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  ariaLabel = 'Dialog',
  closeLabel = 'Schließen',
  hideCloseButton = false,
  overlayClassName,
  panelClassName,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={overlayClassName ? `app-modal-overlay ${overlayClassName}` : 'app-modal-overlay'} onClick={onClose} role="presentation">
      <div
        className={panelClassName ? `app-modal-panel ${panelClassName}` : 'app-modal-panel'}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
        {!hideCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="app-modal-close"
            aria-label={closeLabel}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
