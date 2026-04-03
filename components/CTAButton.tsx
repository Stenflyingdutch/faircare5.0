import Link from 'next/link';
import type { ReactNode } from 'react';

type CTAButtonProps = {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
};

export function CTAButton({ href, children, variant = 'primary' }: CTAButtonProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        padding: '0.85rem 1.5rem',
        fontWeight: 600,
        backgroundColor: variant === 'primary' ? 'var(--color-primary)' : 'var(--color-secondary)',
        color: 'white',
      }}
    >
      {children}
    </Link>
  );
}
