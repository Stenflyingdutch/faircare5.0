import React from 'react';
import { View } from 'react-native';
import { AppTextInput } from '@/components/common/AppTextInput';

interface Props {
  mode: 'login' | 'signup';
  values: any;
  onChange: (next: any) => void;
}

export const EmailForm = ({ mode, values, onChange }: Props) => (
  <View>
    {mode === 'signup' ? (
      <AppTextInput placeholder="First name" value={values.firstName} onChangeText={(v) => onChange({ ...values, firstName: v })} />
    ) : null}
    <AppTextInput placeholder="Email" autoCapitalize="none" value={values.email} onChangeText={(v) => onChange({ ...values, email: v })} />
    <AppTextInput placeholder="Password" secureTextEntry value={values.password} onChangeText={(v) => onChange({ ...values, password: v })} />
    {mode === 'signup' ? (
      <AppTextInput placeholder="Repeat password" secureTextEntry value={values.repeatPassword} onChangeText={(v) => onChange({ ...values, repeatPassword: v })} />
    ) : null}
  </View>
);
