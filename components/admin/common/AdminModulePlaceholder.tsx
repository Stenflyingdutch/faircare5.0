import type { ReactNode } from 'react';

interface AdminModulePlaceholderProps {
  filters?: ReactNode;
  children: ReactNode;
}

export function AdminModulePlaceholder({ filters, children }: AdminModulePlaceholderProps) {
  return (
    <section className="admin-module-card">
      {filters ? <div className="admin-filter-row">{filters}</div> : null}
      <div className="admin-module-body">{children}</div>
    </section>
  );
}
