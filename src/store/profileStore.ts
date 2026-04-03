import { create } from 'zustand';
import type { UserProfile } from '@/types/user';

interface ProfileStore {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
