import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';

export default function RootEntryScreen() {
  const router = useRouter();
  const { loading } = useAuth();
  useUserProfile();
  const targetRoute = useProtectedRoute();

  useEffect(() => {
    if (!loading) router.replace(targetRoute as never);
  }, [loading, router, targetRoute]);

  return <LoadingOverlay />;
}
