import React from 'react';
import { Pressable, Text } from 'react-native';

export const AppButton = ({ label, onPress }: { label: string; onPress: () => void | Promise<void> }) => (
  <Pressable onPress={() => onPress()}><Text>{label}</Text></Pressable>
);
