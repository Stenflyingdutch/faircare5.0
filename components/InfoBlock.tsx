export function InfoBlock({ heading, text }: { heading: string; text: string }) {
  return (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{ marginBottom: 8 }}>{heading}</h3>
      <p style={{ marginTop: 0, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}
