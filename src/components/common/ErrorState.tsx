import React from 'react';
import { Text, View } from 'react-native';

export const ErrorState = ({ message }: { message: string }) => <View><Text>{message}</Text></View>;
