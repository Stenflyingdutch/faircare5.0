'use client';

import { useMemo, useState } from 'react';

import { Modal } from '@/components/Modal';
import { importFromCatalog } from '@/services/familyResponsibility.service';
import type { CatalogResponsibilityCard, FamilyResponsibilityCard } from '@/types/responsibility-cards';

interface CatalogViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  userId: string;
  catalogCards: CatalogResponsibilityCard[];
  familyCards: FamilyResponsibilityCard[];
  onImported: () => Promise<void>;
}

export function CatalogViewModal({
  isOpen,
  onClose,
  familyId,
  userId,
  catalogCards,
  familyCards,
  onImported,
}: CatalogViewModalProps) {
  const [isImportingId, setIsImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importedIds = useMemo(
    () => new Set(familyCards.map((card) => card.sourceCatalogCardId).filter((value): value is string => Boolean(value))),
    [familyCards],
  );

  async function handleImport(catalogCardId: string) {
    setIsImportingId(catalogCardId);
    setError(null);
    try {
      await importFromCatalog(familyId, catalogCardId, userId);
      await onImported();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Übernahme fehlgeschlagen.');
    } finally {
      setIsImportingId(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Katalog öffnen">
      <div className="stack-md">
        <h3>Katalog</h3>
        {catalogCards.length === 0 ? <p className="helper">Keine aktiven Katalog-Karten gefunden.</p> : null}
        {catalogCards.map((catalogCard) => {
          const alreadyImported = importedIds.has(catalogCard.id);
          const isImporting = isImportingId === catalogCard.id;
          return (
            <article key={catalogCard.id} className="card-surface stack-xs">
              <strong>{catalogCard.title}</strong>
              <p>{catalogCard.description}</p>
              <button
                type="button"
                className="btn-secondary"
                disabled={alreadyImported || isImporting}
                onClick={() => handleImport(catalogCard.id)}
              >
                {alreadyImported ? 'Bereits übernommen' : isImporting ? 'Übernehme…' : 'Übernehmen'}
              </button>
            </article>
          );
        })}
        {error ? <p className="inline-error">{error}</p> : null}
      </div>
    </Modal>
  );
}
