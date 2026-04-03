import React from 'react';
import { View } from 'react-native';
import { VerificationNotice } from '@/components/auth/VerificationNotice';
import { AppButton } from '@/components/common/AppButton';

export const EmailVerificationScreen = ({
  onResend,
  onRefresh,
  onBackToLogin,
}: {
  onResend: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onBackToLogin: () => void;
}) => (
  <View>
    <VerificationNotice />
    <AppButton label="Resend email" onPress={onResend} />
    <AppButton label="I verified, re-check" onPress={onRefresh} />
    <AppButton label="Back to login" onPress={onBackToLogin} />
  </View>
);
