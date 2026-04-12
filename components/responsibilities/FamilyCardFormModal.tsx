'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/components/Modal';
import { resolveCategoryLabel } from '@/services/resultCalculator';

interface FamilyCardFormModalProps {
  isOpen: boolean;
  categoryKey: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: { title: string; description: string }) => Promise<void>;
}

export function FamilyCardFormModal({ isOpen, categoryKey, isSaving, onClose, onSubmit }: FamilyCardFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Neue Karte erstellen">
      <div className="stack-md">
        <h3 style={{ margin: 0 }}>Neue Karte</h3>
        {categoryKey ? <p className="helper" style={{ margin: 0 }}>Kategorie: {resolveCategoryLabel(categoryKey)}</p> : null}
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titel"
        />
        <textarea
          className="input"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Beschreibung"
        />
        <div className="responsibility-actions" style={{ justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="btn-primary"
            disabled={isSaving || !title.trim() || !categoryKey}
            onClick={() => void onSubmit({ title, description })}
          >
            {isSaving ? 'Speichere…' : 'Erstellen'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </Modal>
  );
}
