import { useEffect } from 'react';
import { getUserProfile } from '@/services/firebase/userProfileService';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';

export const useUserProfile = () => {
  const authUser = useAuthStore((s) => s.authUser);
  const { profile, setProfile } = useProfileStore();

  useEffect(() => {
    if (!authUser?.uid) return;
    getUserProfile(authUser.uid).then(setProfile);
  }, [authUser?.uid, setProfile]);

  return profile;
};
