'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/components/Modal';
import { resolveCategoryLabel } from '@/services/resultCalculator';
import type { QuizCategory } from '@/types/quiz';

interface FamilyCardFormModalProps {
  isOpen: boolean;
  categoryKey: QuizCategory | null;
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

  async function handleCreate() {
    if (!title.trim() || !categoryKey) return;
    await onSubmit({ title: title.trim(), description: description.trim() });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Neue Familien-Karte erstellen">
      <div className="stack-md">
        <h3 style={{ margin: 0 }}>Neue Karte</h3>
        {categoryKey ? <p className="helper" style={{ margin: 0 }}>{resolveCategoryLabel(categoryKey)}</p> : null}
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titel" />
        <textarea className="input" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Beschreibung" />
        <div className="responsibility-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button type="button" className="btn-primary" disabled={isSaving || !title.trim()} onClick={() => void handleCreate()}>
            {isSaving ? 'Speichere…' : 'Erstellen'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
