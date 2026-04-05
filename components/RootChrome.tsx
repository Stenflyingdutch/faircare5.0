'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export function RootChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPersonalArea = pathname.startsWith('/app');

  if (isPersonalArea) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
