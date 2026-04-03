import type { Metadata } from 'next';
import './globals.css';
import { SiteNavigation } from './components/site-navigation';

export const metadata: Metadata = {
  title: 'FairCare',
  description: 'FairCare – Plattform für mentale Entlastung und Care-Arbeit.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="site-header-inner">
              <div className="brand">FairCare</div>
              <SiteNavigation />
            </div>
          </header>
          <main className="content-wrap">{children}</main>
          <footer className="site-footer">© {new Date().getFullYear()} FairCare</footer>
        </div>
      </body>
    </html>
  );
}
