import type { ReactNode } from 'react';

type SectionWrapperProps = {
  children: ReactNode;
  subdued?: boolean;
};

export function SectionWrapper({ children, subdued = false }: SectionWrapperProps) {
  return (
    <section
      className="section"
      style={{ background: subdued ? '#fafafe' : 'transparent', borderTop: '1px solid var(--color-line)' }}
    >
      <div className="container">{children}</div>
    </section>
  );
}
