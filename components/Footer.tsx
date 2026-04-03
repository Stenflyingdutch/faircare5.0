export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--color-line)', marginTop: '2rem' }}>
      <div className="container" style={{ padding: '1.5rem 0', color: 'var(--color-text-secondary)', fontSize: 14 }}>
        © {new Date().getFullYear()} mental carefair · Plattform für faire Mental-Load-Verteilung in Familien.
      </div>
    </footer>
  );
}
