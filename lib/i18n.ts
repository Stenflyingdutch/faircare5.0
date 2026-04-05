import { defaultTextBlockMap } from '@/data/textBlocks';
import type { Locale, LocalizedText } from '@/types/i18n';

export const defaultLocale: Locale = 'de';

export function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  const raw = window.localStorage.getItem('faircare_locale') || window.navigator.language || defaultLocale;
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('nl')) return 'nl';
  return 'de';
}

export function tr(value: LocalizedText | string | undefined, locale: Locale, placeholder = '[[missing-text]]') {
  if (!value) return placeholder;
  if (typeof value === 'string') return value;
  return value[locale] || value.de || placeholder;
}

type TextDictionary = Record<string, LocalizedText>;

export const uiTexts: TextDictionary = defaultTextBlockMap;

export function t(
  key: string,
  locale: Locale,
  vars?: Record<string, string | number>,
  dictionary: TextDictionary = uiTexts,
) {
  const text = tr(dictionary[key], locale, `[[missing:${key}]]`);
  if (!vars) return text;
  return Object.entries(vars).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, String(value)), text);
}
