import { loginWithApple, loginWithEmail, loginWithGoogle, reloadCurrentUser, sendVerificationEmail, signUpWithEmail } from '@/services/firebase/authService';
import { mapAuthError } from '@/utils/authErrors';
import { markEmailVerified, upsertUserProfileAfterLogin } from '@/services/firebase/userProfileService';

export const completeEmailSignup = async (input: { firstName: string; email: string; password: string }) => {
  try {
    const authUser = await signUpWithEmail(input.email, input.password);
    await upsertUserProfileAfterLogin(authUser, input.firstName);
    return { needsVerification: true };
  } catch (error: any) {
    throw new Error(mapAuthError(error?.code));
  }
};

export const completeEmailLogin = async (input: { email: string; password: string }) => {
  try {
    const authUser = await loginWithEmail(input.email, input.password);
    await upsertUserProfileAfterLogin(authUser);
    return { needsVerification: authUser.provider === 'password' && !authUser.emailVerified };
  } catch (error: any) {
    throw new Error(mapAuthError(error?.code));
  }
};

export const refreshVerificationStatus = async () => {
  const user = await reloadCurrentUser();
  if (user?.emailVerified) await markEmailVerified(user.uid);
  return !!user?.emailVerified;
};

export const resendVerificationEmail = async () => sendVerificationEmail();

export const completeGoogleLogin = async () => {
  try {
    const user = await loginWithGoogle();
    await upsertUserProfileAfterLogin(user);
    return user;
  } catch (error: any) {
    throw new Error(mapAuthError(error?.code));
  }
};

export const completeAppleLogin = async () => {
  try {
    const { authUser, appleProfile } = await loginWithApple();
    await upsertUserProfileAfterLogin(authUser, appleProfile.firstName);
    return authUser;
  } catch (error: any) {
    throw new Error(mapAuthError(error?.code));
  }
};
