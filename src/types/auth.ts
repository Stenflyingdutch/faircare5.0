export type AuthProvider = 'password' | 'google.com' | 'apple.com';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: AuthProvider;
  emailVerified: boolean;
}

export interface AuthState {
  authUser: AuthUser | null;
  loading: boolean;
}
