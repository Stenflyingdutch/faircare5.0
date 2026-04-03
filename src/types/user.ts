import type { AuthProvider } from './auth';

export interface UserProfile {
  uid: string;
  displayName: string;
  firstName: string;
  email: string;
  photoURL?: string;
  provider: AuthProvider;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  locale: string;
  partnerId?: string;
  householdId?: string;
  onboardingCompleted: boolean;
  quizCompleted: boolean;
  hasSeenDetailedResults: boolean;
  hasSeenSharedResults: boolean;
  notificationPreferences: Record<string, boolean>;
  lastActiveAt: string;
}
