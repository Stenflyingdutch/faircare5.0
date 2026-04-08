import type { Locale } from '@/types/i18n';

export interface ContentLocaleSettings {
  activeLocales: Locale[];
  defaultLocale: Locale;
  fallbackLocale: Locale;
}
