interface PrimaryActionButtonProps {
  onPress: () => void;
}

export function PrimaryActionButton({ onPress }: PrimaryActionButtonProps) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%',
        height: '56px',
        backgroundColor: 'var(--color-user-primary)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-button)',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        marginBottom: 'var(--space-16)',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.opacity = '0.92';
        e.currentTarget.style.transform = 'scale(0.99)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      Verantwortlichkeiten zuordnen
    </button>
  );
}
