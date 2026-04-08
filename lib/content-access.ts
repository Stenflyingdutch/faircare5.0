import { defaultLocale, tr, uiTexts } from '@/lib/i18n';
import { fetchContentBlocks, getDefaultContentBlocks } from '@/services/contentBlocks.service';
import type { ContentTextBlock } from '@/types/domain';
import type { ContentLocaleSettings } from '@/types/content';
import type { Locale, LocalizedText } from '@/types/i18n';

export const supportedLocales: Locale[] = ['de', 'en', 'nl'];

export interface TranslationMissingEntry {
  key: string;
  locale: Locale;
}

export interface ContentCatalog {
  dictionary: Record<string, LocalizedText>;
  blocks: ContentTextBlock[];
  localeSettings: ContentLocaleSettings;
  missingTranslations: TranslationMissingEntry[];
}

export const defaultContentLocaleSettings: ContentLocaleSettings = {
  activeLocales: [...supportedLocales],
  defaultLocale,
  fallbackLocale: defaultLocale,
};

function normalizeLocaleSettings(raw?: Partial<ContentLocaleSettings>): ContentLocaleSettings {
  const activeLocales = Array.isArray(raw?.activeLocales) && raw?.activeLocales.length
    ? raw.activeLocales.filter((locale): locale is Locale => supportedLocales.includes(locale as Locale))
    : [...defaultContentLocaleSettings.activeLocales];

  const normalizedDefault = raw?.defaultLocale && supportedLocales.includes(raw.defaultLocale)
    ? raw.defaultLocale
    : defaultContentLocaleSettings.defaultLocale;

  const normalizedFallback = raw?.fallbackLocale && supportedLocales.includes(raw.fallbackLocale)
    ? raw.fallbackLocale
    : normalizedDefault;

  return {
    activeLocales: activeLocales.length ? activeLocales : [...defaultContentLocaleSettings.activeLocales],
    defaultLocale: normalizedDefault,
    fallbackLocale: normalizedFallback,
  };
}

function buildDictionary(blocks: ContentTextBlock[]): Record<string, LocalizedText> {
  const merged: Record<string, LocalizedText> = { ...uiTexts };
  for (const block of blocks) {
    if (!block?.isActive) continue;
    if (!block.key) continue;
    merged[block.key] = block.text;
  }
  return merged;
}

function collectMissingTranslations(blocks: ContentTextBlock[], localeSettings: ContentLocaleSettings): TranslationMissingEntry[] {
  return blocks.flatMap((block) => {
    if (!block?.isActive) return [];
    return localeSettings.activeLocales.flatMap((locale) => {
      const value = block.text?.[locale]?.trim();
      return value ? [] : [{ key: block.key, locale }];
    });
  });
}

export function resolveContentText(
  dictionary: Record<string, LocalizedText>,
  key: string,
  locale: Locale,
  localeSettings: ContentLocaleSettings,
  vars?: Record<string, string | number>,
) {
  const localized = dictionary[key];
  const base = tr(localized, locale, `[[missing:${key}]]`);
  const fallback = localized?.[localeSettings.fallbackLocale]?.trim() || localized?.[localeSettings.defaultLocale]?.trim() || base;
  const rendered = fallback || `[[missing:${key}]]`;
  if (!vars) return rendered;
  return Object.entries(vars).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)), rendered);
}

export async function loadContentCatalog(): Promise<ContentCatalog> {
  try {
    const { blocks, localeSettings } = await fetchContentBlocks();
    const normalizedSettings = normalizeLocaleSettings(localeSettings);
    return {
      blocks,
      dictionary: buildDictionary(blocks),
      localeSettings: normalizedSettings,
      missingTranslations: collectMissingTranslations(blocks, normalizedSettings),
    };
  } catch {
    const blocks = getDefaultContentBlocks();
    return {
      blocks,
      dictionary: buildDictionary(blocks),
      localeSettings: defaultContentLocaleSettings,
      missingTranslations: collectMissingTranslations(blocks, defaultContentLocaleSettings),
    };
  }
}
