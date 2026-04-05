import { getVisibleVersion } from '@/utils/version';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>© {new Date().getFullYear()} FairCare · Plattform für faire Mental-Load-Verteilung in Familien.</p>
        <p className="footer-version">{getVisibleVersion()}</p>
      </div>
    </footer>
  );
}
