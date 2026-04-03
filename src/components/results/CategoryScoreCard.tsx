import React from 'react';
import { Text, View } from 'react-native';
import type { CategoryScore } from '@/types/results';

export const CategoryScoreCard = ({ score }: { score: CategoryScore }) => (
  <View><Text>{score.categoryName}: {Math.round(score.normalizedScore * 100)}%</Text></View>
);
