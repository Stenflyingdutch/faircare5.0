import type { ReactNode } from 'react';

type SectionWrapperProps = {
  children: ReactNode;
  subdued?: boolean;
  id?: string;
};

export function SectionWrapper({ children, subdued = false, id }: SectionWrapperProps) {
  return (
    <section id={id} className={`section ${subdued ? 'section-subdued' : 'section-default'}`}>
      <div className="container">{children}</div>
    </section>
  );
}
