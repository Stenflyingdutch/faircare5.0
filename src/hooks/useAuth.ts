import { useEffect } from 'react';
import { onAuthStateChanged } from '@/services/firebase/authService';
import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const { authUser, loading, setAuthUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged((user) => {
      setAuthUser(user);
      setLoading(false);
    });
    return unsub;
  }, [setAuthUser, setLoading]);

  return { authUser, loading };
};
