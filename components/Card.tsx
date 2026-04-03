import type { ReactNode } from 'react';

type CardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function Card({ title, description, children }: CardProps) {
  return (
    <article
      style={{
        border: '1px solid var(--color-line)',
        borderRadius: 16,
        padding: '1.2rem',
        background: '#fff',
      }}
    >
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
      {children}
    </article>
  );
}
