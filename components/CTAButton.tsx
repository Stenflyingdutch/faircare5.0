import Link from 'next/link';
import type { ReactNode } from 'react';

type CTAButtonProps = {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
};

export function CTAButton({ href, children, variant = 'primary' }: CTAButtonProps) {
  return (
    <Link href={href} className={`cta-button ${variant}`}>
      {children}
    </Link>
  );
}
