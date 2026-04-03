import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { EmailForm } from '@/components/auth/EmailForm';
import { AppButton } from '@/components/common/AppButton';

export const EmailLoginScreen = ({ onSubmit, onForgotPassword }: {
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  onForgotPassword?: () => void;
}) => {
  const [values, setValues] = useState({ email: '', password: '' });

  return (
    <View>
      <EmailForm mode="login" values={values} onChange={setValues} />
      <AppButton label="Log in" onPress={() => onSubmit(values)} />
      {onForgotPassword ? <Text onPress={onForgotPassword}>Forgot password?</Text> : null}
    </View>
  );
};
