import type { ReactNode } from 'react';

type SectionWrapperProps = {
  children: ReactNode;
  subdued?: boolean;
  id?: string;
  className?: string;
};

export function SectionWrapper({ children, subdued = false, id, className }: SectionWrapperProps) {
  const sectionClassName = ['section', subdued ? 'section-subdued' : 'section-default', className]
    .filter(Boolean)
    .join(' ');

  return (
    <section id={id} className={sectionClassName}>
      <div className="container">{children}</div>
    </section>
  );
}
