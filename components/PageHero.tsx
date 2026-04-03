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
    <section className="section" style={{ paddingTop: '5rem' }}>
      <div className="container">
        {badge && <Badge>{badge}</Badge>}
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', marginBottom: '0.5rem' }}>{title}</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', maxWidth: 720 }}>{subtitle}</p>
        {actions ? <div style={{ marginTop: '1.5rem' }}>{actions}</div> : null}
      </div>
    </section>
  );
}
