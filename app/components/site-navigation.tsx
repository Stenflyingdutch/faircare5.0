import Link from 'next/link';

const links = [
  { href: '/', label: 'Startseite' },
  { href: '/mental-load', label: 'Mental Load' },
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/newsletter', label: 'Newsletter' },
  { href: '/login', label: 'Login' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin', label: 'Admin' },
];

export function SiteNavigation() {
  return (
    <nav aria-label="Hauptnavigation">
      <ul className="nav-list">
        {links.map((link) => (
          <li key={link.href}>
            <Link className="nav-link" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
