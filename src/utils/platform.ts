import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export const isAppleSignInSupported = async () => {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
};
