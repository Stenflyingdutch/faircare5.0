import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';

export const useRequireVerifiedEmail = () => {
  const authUser = useAuthStore((s) => s.authUser);

  return useMemo(() => {
    if (!authUser) return false;
    if (authUser.provider !== 'password') return false;
    return !authUser.emailVerified;
  }, [authUser]);
};
