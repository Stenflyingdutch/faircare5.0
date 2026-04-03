import React from 'react';
import { Text, View } from 'react-native';
import type { SharedResult } from '@/types/results';

export const SharedResultsScreen = ({ result }: { result: SharedResult }) => (
  <View>
    <Text>{result.combinedSummary}</Text>
    {result.categoryDifferences.map((diff) => (
      <Text key={diff.categoryId}>{diff.categoryId}: {diff.gap.toFixed(2)}</Text>
    ))}
  </View>
);
