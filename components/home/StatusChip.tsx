type StatusType = 'unassigned' | 'in_clarification' | 'assigned';

interface StatusChipProps {
  status: StatusType;
}

const statusConfig = {
  unassigned: {
    label: 'Noch nicht zugeordnet',
    backgroundColor: 'var(--color-neutral-soft)',
    textColor: 'var(--color-neutral-primary)',
  },
  in_clarification: {
    label: 'In Klärung',
    backgroundColor: 'var(--color-partner-soft)',
    textColor: 'var(--color-partner-primary)',
  },
  assigned: {
    label: 'Zugeordnet',
    backgroundColor: 'var(--color-user-soft)',
    textColor: 'var(--color-user-primary)',
  },
};

export function StatusChip({ status }: StatusChipProps) {
  const config = statusConfig[status];
  return (
    <span
      className="status-chip caption"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        padding: 'var(--space-4) var(--space-8)',
        borderRadius: 'var(--radius-pill)',
        display: 'inline-block',
      }}
    >
      {config.label}
    </span>
  );
}