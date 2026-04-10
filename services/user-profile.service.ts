import type { UserRole, UserAccountStatus } from '@/types/domain';
import type { AppUserProfile } from '@/types/partner-flow';

export function normalizeEmailAddress(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

export function normalizePersonName(value?: string | null) {
  return value?.trim() ?? '';
}

export function buildDisplayName(firstName?: string | null, lastName?: string | null) {
  return [normalizePersonName(firstName), normalizePersonName(lastName)].filter(Boolean).join(' ').trim();
}

export function deriveFirstName(profile?: Pick<AppUserProfile, 'firstName' | 'displayName'> | null) {
  return normalizePersonName(profile?.firstName) || normalizePersonName(profile?.displayName?.split(' ')[0]);
}

export function deriveLastName(profile?: Pick<AppUserProfile, 'lastName' | 'displayName'> | null) {
  return normalizePersonName(profile?.lastName)
    || normalizePersonName(profile?.displayName?.split(' ').slice(1).join(' '));
}

export function resolveAdminRole(profile?: Pick<AppUserProfile, 'adminRole'> | null): UserRole {
  return profile?.adminRole === 'admin' ? 'admin' : 'user';
}

export function resolveAccountStatus(profile?: Pick<AppUserProfile, 'accountStatus'> | null): UserAccountStatus {
  return profile?.accountStatus === 'blocked' ? 'blocked' : 'active';
}

export function isAdminProfile(profile?: Pick<AppUserProfile, 'adminRole' | 'accountStatus'> | null) {
  return resolveAdminRole(profile) === 'admin' && resolveAccountStatus(profile) === 'active';
}

export function isBlockedProfile(profile?: Pick<AppUserProfile, 'accountStatus'> | null) {
  return resolveAccountStatus(profile) === 'blocked';
}
