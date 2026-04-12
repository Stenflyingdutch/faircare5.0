'use client';

import { useMemo, useState } from 'react';

import { Modal } from '@/components/Modal';
import { importFromCatalog } from '@/services/familyResponsibility.service';
import { resolveCategoryLabel } from '@/services/resultCalculator';
import type { CatalogResponsibilityCard, FamilyResponsibilityCard } from '@/types/responsibility-cards';

interface CatalogViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  userId: string;
  categoryKey: string | null;
  isLoading: boolean;
  error: string | null;
  catalogCards: CatalogResponsibilityCard[];
  familyCards: FamilyResponsibilityCard[];
  onImported: () => Promise<void>;
}

export function CatalogViewModal({
  isOpen,
  onClose,
  familyId,
  userId,
  categoryKey,
  isLoading,
  error,
  catalogCards,
  familyCards,
  onImported,
}: CatalogViewModalProps) {
  const [isImportingId, setIsImportingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const importedIds = useMemo(
    () => new Set(familyCards.map((card) => card.sourceCatalogCardId).filter((value): value is string => Boolean(value))),
    [familyCards],
  );

  async function handleImport(catalogCardId: string) {
    setIsImportingId(catalogCardId);
    setImportError(null);
    try {
      await importFromCatalog(familyId, catalogCardId, userId);
      await onImported();
    } catch (caughtError) {
      setImportError(caughtError instanceof Error ? caughtError.message : 'Übernahme fehlgeschlagen.');
    } finally {
      setIsImportingId(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Katalog öffnen">
      <div className="stack-md">
        <h3 style={{ margin: 0 }}>Katalog</h3>
        {categoryKey ? <p className="helper" style={{ margin: 0 }}>Kategorie: {resolveCategoryLabel(categoryKey)}</p> : null}
        {isLoading ? <p className="helper">Katalog wird geladen…</p> : null}
        {!isLoading && catalogCards.length === 0 ? <p className="helper">Keine aktiven Katalog-Karten gefunden.</p> : null}
        {catalogCards.map((catalogCard) => {
          const alreadyImported = importedIds.has(catalogCard.id);
          const isImporting = isImportingId === catalogCard.id;
          return (
            <article key={catalogCard.id} className="card-surface stack-xs">
              <strong>{catalogCard.title}</strong>
              <p>{catalogCard.description}</p>
              {catalogCard.tags?.length ? <p className="helper" style={{ margin: 0 }}>Tags: {catalogCard.tags.join(' · ')}</p> : null}
              <button
                type="button"
                className="btn-secondary"
                disabled={alreadyImported || isImporting}
                onClick={() => void handleImport(catalogCard.id)}
              >
                {alreadyImported ? 'Bereits übernommen' : isImporting ? 'Übernehme…' : 'Übernehmen'}
              </button>
            </article>
          );
        })}
        {error ? <p className="inline-error">{error}</p> : null}
        {importError ? <p className="inline-error">{importError}</p> : null}
      </div>
    </Modal>
  );
}
