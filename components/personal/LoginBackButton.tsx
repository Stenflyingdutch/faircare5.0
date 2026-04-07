'use client';

import { useRouter } from 'next/navigation';

type LoginBackButtonProps = {
  fallbackHref: string;
  label: string;
};

export function LoginBackButton({ fallbackHref, label }: LoginBackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window === 'undefined') {
      router.push(fallbackHref);
      return;
    }

    const hasHistoryEntry = window.history.length > 1;
    const sameOriginReferrer = document.referrer && document.referrer.startsWith(window.location.origin);

    if (hasHistoryEntry && sameOriginReferrer) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button type="button" className="button settings-back-button" onClick={handleBack}>
      {label}
    </button>
  );
}
