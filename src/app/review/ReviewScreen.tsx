import React from 'react';
import { View } from 'react-native';
import { AppButton } from '@/components/common/AppButton';

export const ReviewScreen = ({ onViewResults }: { onViewResults: () => void }) => (
  <View>
    <AppButton label="View quiz results" onPress={onViewResults} />
  </View>
);
