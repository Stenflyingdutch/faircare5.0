import type { Timestamp } from 'firebase/firestore';

export type ResponsibilityCatalogLanguage = 'de' | 'en' | 'nl';
export type ResponsibilityCatalogAgeGroup = '0-1' | '1-3' | '3-6' | '6-12' | '12-18';

export interface CatalogResponsibilityCard {
  id: string;
  categoryKey: string;
  title: string;
  description: string;
  language: ResponsibilityCatalogLanguage;
  ageGroup: ResponsibilityCatalogAgeGroup;
  sortOrder: number;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy: string;
  updatedBy: string;
  tags?: string[];
  version?: number;
}

export type FamilyResponsibilitySourceType = 'catalog' | 'custom';
export type FamilyResponsibilityStatus = 'open' | 'done';
export type FamilyResponsibilityFocusState = 'now' | 'soon' | 'later' | null;

export interface FamilyResponsibilityCard {
  id: string;
  familyId: string;
  categoryKey: string;
  title: string;
  description: string;
  sourceType: FamilyResponsibilitySourceType;
  sourceCatalogCardId: string | null;
  importedAt: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy: string;
  updatedBy: string;
  assigneeUserId: string | null;
  status: FamilyResponsibilityStatus;
  focusState: FamilyResponsibilityFocusState;
  isArchived: boolean;
  delegationState?: string;
  lastMessageAt?: Timestamp;
  messageCount?: number;
}
