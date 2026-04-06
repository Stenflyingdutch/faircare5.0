export function SkeletonCategoryCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-16)',
        boxShadow: 'var(--shadow-card)',
        minHeight: '96px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    >
      <div style={{ height: '18px', backgroundColor: 'var(--color-border-soft)', borderRadius: '4px', marginBottom: 'var(--space-8)', width: '60%' }} />
      <div style={{ height: '13px', backgroundColor: 'var(--color-border-soft)', borderRadius: '4px', marginBottom: 'var(--space-4)', width: '80%' }} />
      <div style={{ height: '13px', backgroundColor: 'var(--color-border-soft)', borderRadius: '4px', width: '50%' }} />
    </div>
  );
}

// Add pulse animation to globals.css if not present
// @keyframes pulse {
//   0%, 100% { opacity: 1; }
//   50% { opacity: 0.5; }
// }