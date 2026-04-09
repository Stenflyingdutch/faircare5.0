import { getVisibleVersion } from '@/utils/version';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>© {new Date().getFullYear()} FairCare · Mach sichtbar, was sonst untergeht.</p>
        <p className="footer-version">{getVisibleVersion()}</p>
      </div>
    </footer>
  );
}
