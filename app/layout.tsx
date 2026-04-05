import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { RootChrome } from '@/components/RootChrome';

import './globals.css';

export const metadata: Metadata = {
  title: 'FairCare',
  description: 'Web-Plattform für faire Mental-Load-Verteilung in Familien.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
