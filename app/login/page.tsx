import LoginPageClient from './LoginPageClient';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const redirectToParam = resolvedSearchParams?.redirectTo;
  const redirectTo = Array.isArray(redirectToParam) ? redirectToParam[0] : redirectToParam;
  const resetParam = resolvedSearchParams?.reset;
  const reset = Array.isArray(resetParam) ? resetParam[0] : resetParam;
  const resetNotice = reset === 'success'
    ? 'Dein Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt mit dem neuen Passwort anmelden.'
    : null;

  return <LoginPageClient redirectTo={redirectTo ?? null} resetNotice={resetNotice} />;
}
