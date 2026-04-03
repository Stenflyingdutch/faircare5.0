import React from 'react';
import { View } from 'react-native';
import { ScoreCard } from '@/components/results/ScoreCard';
import { CategoryScoreCard } from '@/components/results/CategoryScoreCard';
import { InsightCard } from '@/components/results/InsightCard';
import type { IndividualResult } from '@/types/results';

export const IndividualResultsOverviewScreen = ({ result }: { result: IndividualResult }) => (
  <View>
    <ScoreCard title="Total score" value={result.totalScore} />
    {result.categoryScores.map((category) => <CategoryScoreCard key={category.categoryId} score={category} />)}
    {result.topStressAreas.map((item) => <InsightCard key={item.title} insight={item} />)}
    {result.topBalancedAreas.map((item) => <InsightCard key={item.title} insight={item} />)}
  </View>
);
