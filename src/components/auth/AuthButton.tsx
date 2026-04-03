import React from 'react';
import { AppButton } from '@/components/common/AppButton';

export const AuthButton = ({ label, onPress }: { label: string; onPress: () => void | Promise<void> }) => (
  <AppButton label={label} onPress={onPress} />
);
