import type { ReactNode } from 'react';

type CardProps = {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export function Card({ title, description, children, className }: CardProps) {
  return (
    <article className={className ? `card ${className}` : 'card'}>
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>
      {children}
    </article>
  );
}
