import ForgotPasswordPageClient, { type InitialForgotPasswordNotice } from './ForgotPasswordPageClient';

type ForgotPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveInitialNotice(status: string | undefined): InitialForgotPasswordNotice {
  switch (status) {
    case 'success':
      return {
        kind: 'success',
        text: 'Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt mit dem neuen Passwort anmelden.',
      };
    case 'expired':
      return {
        kind: 'error',
        text: 'Der Link zum Zurücksetzen ist abgelaufen. Bitte fordere eine neue E-Mail an.',
      };
    case 'error':
      return {
        kind: 'error',
        text: 'Der Passwort-Reset konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
      };
    default:
      return null;
  }
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const email = firstParam(resolvedSearchParams?.email)?.trim() ?? '';
  const status = firstParam(resolvedSearchParams?.status)?.trim();

  return (
    <ForgotPasswordPageClient
      initialEmail={email}
      initialNotice={resolveInitialNotice(status)}
    />
  );
}
