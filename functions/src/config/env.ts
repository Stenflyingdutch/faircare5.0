import { defineSecret, defineString } from 'firebase-functions/params';

export const APP_ENV = defineString('APP_ENV', { default: 'development' });
export const MAIL_FROM = defineString('MAIL_FROM', { default: 'FairCare <noreply@faircare.local>' });
export const APP_BASE_URL = defineString('APP_BASE_URL', { default: 'http://localhost:3000' });
export const TEST_EMAIL_OVERRIDE = defineString('TEST_EMAIL_OVERRIDE', { default: 'pa4sten@gmail.com' });
export const MAIL_PROVIDER = defineString('MAIL_PROVIDER', { default: 'resend' });
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

export type AppEnvironment = 'development' | 'test' | 'staging' | 'production';

export function getAppEnvironment(): AppEnvironment {
  const value = APP_ENV.value();
  if (value === 'development' || value === 'test' || value === 'staging' || value === 'production') {
    return value;
  }
  return 'development';
}

export function getMailConfig() {
  return {
    env: getAppEnvironment(),
    from: MAIL_FROM.value(),
    appBaseUrl: APP_BASE_URL.value().replace(/\/$/, ''),
    testEmailOverride: TEST_EMAIL_OVERRIDE.value(),
    provider: MAIL_PROVIDER.value(),
    resendApiKey: RESEND_API_KEY.value(),
  };
}
