import ResetPasswordPageClient from './ResetPasswordPageClient';

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <ResetPasswordPageClient
      mode={firstParam(resolvedSearchParams?.mode) ?? null}
      oobCode={firstParam(resolvedSearchParams?.oobCode) ?? null}
      continueUrl={firstParam(resolvedSearchParams?.continueUrl) ?? null}
      languageCode={firstParam(resolvedSearchParams?.lang) ?? null}
      apiKey={firstParam(resolvedSearchParams?.apiKey) ?? null}
    />
  );
}
