const AUTH_ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/account-exists-with-different-credential': 'An account already exists with a different login method.',
  'auth/unverified-email': 'Please verify your email first.',
};

export const mapAuthError = (errorCode?: string) => AUTH_ERROR_MAP[errorCode || ''] || 'Something went wrong. Please try again.';
