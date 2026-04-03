import type { ReactNode } from 'react';

type SectionWrapperProps = {
  children: ReactNode;
  subdued?: boolean;
};

export function SectionWrapper({ children, subdued = false }: SectionWrapperProps) {
  return (
    <section className={`section ${subdued ? 'section-subdued' : 'section-default'}`}>
      <div className="container">{children}</div>
    </section>
  );
}
