import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SocialLoginButton } from '@/components/auth/SocialLoginButton';
import { AppButton } from '@/components/common/AppButton';
import { isAppleSignInSupported } from '@/utils/platform';

interface Props {
  onGoogle: () => void;
  onApple: () => void;
  onSignUpEmail: () => void;
  onLoginEmail: () => void;
}

export const AuthHomeScreen = ({ onGoogle, onApple, onSignUpEmail, onLoginEmail }: Props) => {
  const [appleSupported, setAppleSupported] = useState(false);

  useEffect(() => {
    isAppleSignInSupported().then(setAppleSupported);
  }, []);

  return (
    <View>
      <SocialLoginButton provider="google" onPress={onGoogle} />
      {appleSupported ? <SocialLoginButton provider="apple" onPress={onApple} /> : null}
      <AppButton label="Sign up with email" onPress={onSignUpEmail} />
      <AppButton label="Log in with email" onPress={onLoginEmail} />
    </View>
  );
};
