export type AdminLocale = 'de' | 'en' | 'nl';

export type TranslationMap = Record<AdminLocale, string>;

export type TranslationStatus =
  | 'complete'
  | 'missing_de'
  | 'missing_en'
  | 'missing_nl'
  | 'outdated_en'
  | 'outdated_nl';

export type AdminEntityStatus = 'draft' | 'active' | 'inactive' | 'archived';

export type AdminUserRole = 'super_admin' | 'admin' | 'content_admin' | 'support_admin';
