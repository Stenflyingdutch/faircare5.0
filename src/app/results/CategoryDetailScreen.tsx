import React from 'react';
import { Text, View } from 'react-native';
import { QuestionResultItem } from '@/components/results/QuestionResultItem';
import type { CategoryScore, QuestionBreakdownItem } from '@/types/results';

export const CategoryDetailScreen = ({
  category,
  questions,
}: {
  category: CategoryScore;
  questions: QuestionBreakdownItem[];
}) => (
  <View>
    <Text>{category.categoryName}</Text>
    <Text>{category.interpretation}</Text>
    {questions.map((question) => <QuestionResultItem key={question.questionId} item={question} />)}
  </View>
);
