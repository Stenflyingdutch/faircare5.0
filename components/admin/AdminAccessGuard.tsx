'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { observeAuthState } from '@/services/auth.service';
import { verifyAdminAccess } from '@/services/admin-user-management.client';

export function AdminAccessGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        await verifyAdminAccess();
        setIsAllowed(true);
      } catch {
        router.replace('/app/home');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <section className="section">
        <div className="container">Admin-Rechte werden geprüft …</div>
      </section>
    );
  }

  if (!isAllowed) return null;

  return <>{children}</>;
}
