import LoginPageClient from './LoginPageClient';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const redirectToParam = resolvedSearchParams?.redirectTo;
  const redirectTo = Array.isArray(redirectToParam) ? redirectToParam[0] : redirectToParam;

  return <LoginPageClient redirectTo={redirectTo ?? null} />;
}
