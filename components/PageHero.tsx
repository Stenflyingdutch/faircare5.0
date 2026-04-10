import type { ReactNode } from 'react';

import { Badge } from '@/components/Badge';

type PageHeroProps = {
  badge?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHero({ badge, title, subtitle, actions, className }: PageHeroProps) {
  const sectionClassName = className ? `section page-hero ${className}` : 'section page-hero';
  return (
    <section className={sectionClassName}>
      <div className="container">
        {badge && <Badge>{badge}</Badge>}
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{subtitle}</p>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
    </section>
  );
}
