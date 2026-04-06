export type Locale = 'de' | 'en' | 'nl';

export type LocalizedText = Partial<Record<Locale, string>>;
export type LocalizedTextList = Partial<Record<Locale, string[]>>;

export function resolveLocalizedText(value: LocalizedText | string | undefined, locale: Locale, placeholder = '[[missing-text]]') {
  if (!value) return placeholder;
  if (typeof value === 'string') return value;
  return value[locale] || value.de || placeholder;
}
