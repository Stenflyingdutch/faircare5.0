import React from 'react';
import { Text, View } from 'react-native';
import type { ResultInsight } from '@/types/results';

export const InsightCard = ({ insight }: { insight: ResultInsight }) => (
  <View><Text>{insight.title}</Text><Text>{insight.description}</Text></View>
);
