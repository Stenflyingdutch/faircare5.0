'use client';

import { useState } from 'react';

import { Modal } from '@/components/Modal';

interface FamilyCardCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string) => Promise<void>;
}

export function FamilyCardCreateModal({ isOpen, onClose, onCreate }: FamilyCardCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate(title, description);
      setTitle('');
      setDescription('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Neue Karte erstellen">
      <div className="stack-md">
        <h3>Neue Karte</h3>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titel" />
        <textarea className="input" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Beschreibung" />
        <div className="responsibility-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button type="button" className="btn-primary" disabled={isSubmitting || !title.trim()} onClick={() => void handleSubmit()}>
            {isSubmitting ? 'Speichere…' : 'Erstellen'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
