interface HomeHeaderProps {
  userFirstName: string;
  quizCompletedByUser?: boolean;
  quizCompletedByPartner?: boolean;
}

export function HomeHeader({ userFirstName, quizCompletedByUser, quizCompletedByPartner }: HomeHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return `Guten Morgen`;
    if (hour < 18) return `Guten Mittag`;
    return `Guten Abend`;
  };

  return (
    <header style={{ padding: 'var(--space-16) var(--space-20) var(--space-16)', backgroundColor: 'var(--color-background)' }}>
      <h1 className="display" style={{ margin: 0 }}>{getGreeting()} {userFirstName}!</h1>
    </header>
  );
}