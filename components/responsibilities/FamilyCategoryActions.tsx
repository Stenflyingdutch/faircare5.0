'use client';

interface FamilyCategoryActionsProps {
  onOpenCatalog: () => void;
  onCreateCard: () => void;
}

export function FamilyCategoryActions({ onOpenCatalog, onCreateCard }: FamilyCategoryActionsProps) {
  return (
    <div className="responsibility-actions" data-testid="responsibility-actions">
      <button type="button" className="btn-secondary" onClick={onOpenCatalog}>Katalog</button>
      <button type="button" className="btn-primary" onClick={onCreateCard}>Neue Karte</button>
    </div>
  );
}
