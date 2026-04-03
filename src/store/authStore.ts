import { create } from 'zustand';
import type { AuthState, AuthUser } from '@/types/auth';

interface AuthStore extends AuthState {
  setAuthUser: (authUser: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  authUser: null,
  loading: true,
  setAuthUser: (authUser) => set({ authUser }),
  setLoading: (loading) => set({ loading }),
}));
