import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { EmailForm } from '@/components/auth/EmailForm';
import { AppButton } from '@/components/common/AppButton';
import { isValidEmail, validatePassword } from '@/utils/validation';

interface FormValues {
  firstName: string;
  email: string;
  password: string;
  repeatPassword: string;
}

export const EmailSignUpScreen = ({ onSubmit }: { onSubmit: (values: FormValues) => Promise<void> }) => {
  const [values, setValues] = useState<FormValues>({ firstName: '', email: '', password: '', repeatPassword: '' });
  const [error, setError] = useState('');

  const submit = async () => {
    if (!isValidEmail(values.email)) return setError('Please enter a valid email.');
    if (values.password !== values.repeatPassword) return setError('Passwords do not match.');
    const pwdErr = validatePassword(values.password);
    if (pwdErr) return setError(pwdErr);
    setError('');
    await onSubmit(values);
  };

  return (
    <View>
      <EmailForm mode="signup" values={values} onChange={setValues} />
      {!!error && <Text>{error}</Text>}
      <AppButton label="Create account" onPress={submit} />
    </View>
  );
};
