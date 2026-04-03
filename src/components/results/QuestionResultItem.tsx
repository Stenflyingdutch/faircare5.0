import React from 'react';
import { Text, View } from 'react-native';
import type { QuestionBreakdownItem } from '@/types/results';

export const QuestionResultItem = ({ item }: { item: QuestionBreakdownItem }) => (
  <View>
    <Text>{item.questionText}</Text>
    <Text>Answer: {item.selectedAnswer} · Score: {item.scoreValue}</Text>
    {!!item.interpretation && <Text>{item.interpretation}</Text>}
  </View>
);
