import { redirect } from 'next/navigation';

import { sanitizeInvitationToken } from '@/services/partnerFlow.service';

type InvitePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InviteQueryEntryPage({ searchParams }: InvitePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tokenParam = resolvedSearchParams?.token;
  const rawToken = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const token = sanitizeInvitationToken(rawToken);

  if (token) {
    redirect(`/invite/${encodeURIComponent(token)}`);
  }

  redirect('/invite/invalid');
}
