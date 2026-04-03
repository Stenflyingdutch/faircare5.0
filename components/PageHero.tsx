import type { ReactNode } from 'react';

import { Badge } from '@/components/Badge';

type PageHeroProps = {
  badge?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

export function PageHero({ badge, title, subtitle, actions }: PageHeroProps) {
  return (
    <section className="section page-hero">
      <div className="container">
        {badge && <Badge>{badge}</Badge>}
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{subtitle}</p>
        {actions ? <div className="hero-actions">{actions}</div> : null}
      </div>
    </section>
  );
}
