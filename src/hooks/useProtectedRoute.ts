import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { ROUTES } from '@/constants/routes';

export const useProtectedRoute = () => {
  const { authUser } = useAuthStore();
  const { profile } = useProfileStore();

  return useMemo(() => {
    if (!authUser) return ROUTES.AUTH_HOME;
    if (authUser.provider === 'password' && !authUser.emailVerified) return ROUTES.EMAIL_VERIFICATION;
    if (!profile?.onboardingCompleted) return ROUTES.ONBOARDING;
    if (!profile.quizCompleted) return ROUTES.QUIZ;
    return ROUTES.HOME;
  }, [authUser, profile]);
};
