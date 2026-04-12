'use client';

interface ResponsibilityHeaderActionsProps {
  onOpenCatalog: () => void;
  onCreateCard: () => void;
  catalogLabel?: string;
}

export function ResponsibilityHeaderActions({
  onOpenCatalog,
  onCreateCard,
  catalogLabel = 'Katalog',
}: ResponsibilityHeaderActionsProps) {
  return (
    <div className="responsibility-actions" data-testid="responsibility-actions">
      <button type="button" className="btn-secondary" onClick={onOpenCatalog}>{catalogLabel}</button>
      <button type="button" className="btn-primary" onClick={onCreateCard}>Neue Karte</button>
    </div>
  );
}
