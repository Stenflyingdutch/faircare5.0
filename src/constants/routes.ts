export const ROUTES = {
  AUTH_HOME: '/auth',
  EMAIL_LOGIN: '/auth/email-login',
  EMAIL_SIGN_UP: '/auth/email-signup',
  EMAIL_VERIFICATION: '/auth/email-verification',
  ONBOARDING: '/onboarding',
  QUIZ: '/quiz',
  HOME: '/(tabs)/home',
  REVIEW: '/(tabs)/review',
  TEST: '/(tabs)/test',
  SETTINGS: '/(tabs)/settings',
  RESULTS_OVERVIEW: '/results/overview',
  CATEGORY_DETAIL: '/results/category',
  SHARED_RESULTS: '/results/shared',
} as const;

export type RouteKey = keyof typeof ROUTES;
