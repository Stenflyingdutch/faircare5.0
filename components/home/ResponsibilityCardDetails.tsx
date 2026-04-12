'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
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
  onSave,
  onDelete,
}: ResponsibilityCardDetailsProps) {
  const [titleDraft, setTitleDraft] = useState(responsibility.title);
  const [noteDraft, setNoteDraft] = useState(responsibility.note ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    setTitleDraft(responsibility.title);
    setNoteDraft(responsibility.note ?? '');
  }, [isExpanded, responsibility.title, responsibility.note]);

  if (!isExpanded) return null;

  const categoryLabel = categoryLabelMap[responsibility.categoryKey] || responsibility.categoryKey;
  const popupVisual = priorityVisuals[responsibility.priority];

  return (
    <Modal
      isOpen={isExpanded}
      onClose={onClose}
      ariaLabel="Details zum Verantwortungsgebiet"
      panelClassName="responsibility-details-modal"
      hideCloseButton
    >
      <div
        className="responsibility-details-surface"
        style={{
          background: popupVisual.background,
          color: popupVisual.text,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="responsibility-details-close"
        >
          ×
        </button>

        <div className="responsibility-details-header">
          <p className="responsibility-details-eyebrow" style={{ color: popupVisual.eyebrow }}>
            {categoryLabel}
          </p>
          <p className="responsibility-details-meta" style={{ color: popupVisual.eyebrow }}>
            {mode === 'start' ? `Status: ${priorityLabels[responsibility.priority]}` : 'Details'}
          </p>
        </div>

        <div className="responsibility-details-section">
          <label className="responsibility-details-label">
            Titel
          </label>
          <input
            className="responsibility-details-value"
            style={{
              border: mode === 'start' && responsibility.priority === 'act' ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(47, 111, 109, 0.12)',
              backgroundColor: mode === 'start' && responsibility.priority === 'act' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)',
            }}
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            readOnly={mode === 'start'}
          />
        </div>

        <div className="responsibility-details-section">
          <label className="responsibility-details-label">
            Details
          </label>
          <textarea
            className="responsibility-details-value responsibility-details-value--multiline"
            style={{
              border: mode === 'start' && responsibility.priority === 'act' ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(47, 111, 109, 0.12)',
              backgroundColor: mode === 'start' && responsibility.priority === 'act' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.42)',
            }}
            value={noteDraft}
            placeholder="Keine weiteren Details hinterlegt."
            onChange={(event) => setNoteDraft(event.target.value)}
            readOnly={mode === 'start'}
            rows={5}
          />
        </div>

        <div className="responsibility-details-actions">
          {mode === 'assign' && onSave ? (
            <button
              type="button"
              onClick={async () => {
                setIsSaving(true);
                try {
                  await onSave(titleDraft, noteDraft);
                  onClose();
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="responsibility-details-action"
              style={{
                border: '1px solid rgba(47, 111, 109, 0.16)',
                backgroundColor: 'rgba(255,255,255,0.8)',
                color: popupVisual.text,
              }}
            >
              Speichern
            </button>
          ) : null}
          {mode === 'assign' && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSaving}
              className="responsibility-details-action"
              style={{
                border: '1px solid rgba(178, 48, 48, 0.35)',
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#8b1f1f',
              }}
            >
              Löschen
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="responsibility-details-action"
            style={{
              border: mode === 'start' && responsibility.priority === 'act' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(47, 111, 109, 0.16)',
              backgroundColor: mode === 'start' && responsibility.priority === 'act' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
              color: popupVisual.text,
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </Modal>
  );
}
