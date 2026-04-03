import React from 'react';
import { AppButton } from '@/components/common/AppButton';

export const SocialLoginButton = ({ provider, onPress }: { provider: 'google' | 'apple'; onPress: () => void | Promise<void> }) => (
  <AppButton label={`Continue with ${provider === 'google' ? 'Google' : 'Apple'}`} onPress={onPress} />
);
