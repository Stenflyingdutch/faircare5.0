import type { ReactNode } from 'react';

type CardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function Card({ title, description, children }: CardProps) {
  return (
    <article className="card">
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>
      {children}
    </article>
  );
}
