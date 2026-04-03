import type { ReactNode } from 'react';

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        borderRadius: 999,
        padding: '0.3rem 0.75rem',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--color-secondary)',
        background: 'rgba(15,118,110,0.12)',
      }}
    >
      {children}
    </span>
  );
}
