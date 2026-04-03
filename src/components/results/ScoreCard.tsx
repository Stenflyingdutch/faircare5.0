import React from 'react';
import { Text, View } from 'react-native';

export const ScoreCard = ({ title, value }: { title: string; value: number }) => <View><Text>{title}: {value}</Text></View>;
