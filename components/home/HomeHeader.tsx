interface HomeHeaderProps {
  userFirstName: string;
}

function capitalizeFirstLetter(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function HomeHeader({ userFirstName }: HomeHeaderProps) {
  const name = capitalizeFirstLetter(userFirstName);
  const titleText = name ? `Servus ${name}!` : 'Servus!';

  return (
    <header style={{ padding: 'var(--space-20) var(--space-20) 0', backgroundColor: 'transparent' }}>
      <h1 className="display" style={{ margin: 0, fontWeight: 700 }}>{titleText}</h1>
    </header>
  );
}
