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

type UITexts = Record<string, LocalizedText>;

export const uiTexts: UITexts = {
  'quiz.filter.title': { de: 'Vor dem Quiz', en: 'Before the quiz', nl: 'Voor de quiz' },
  'quiz.filter.step': { de: 'Schritt {current} von {total}', en: 'Step {current} of {total}', nl: 'Stap {current} van {total}' },
  'quiz.filter.childCount': { de: 'Wie viele Kinder habt ihr?', en: '', nl: '' },
  'quiz.filter.ageGroup': { de: 'Wie alt ist das jüngste Kind?', en: '', nl: '' },
  'quiz.filter.childcare': { de: 'Welche externe Betreuung nutzt ihr aktuell? (Mehrfachauswahl)', en: '', nl: '' },
  'quiz.filter.split': { de: 'Wie klar ist eure Aufteilung heute?', en: '', nl: '' },
  'common.back': { de: 'Zurück', en: 'Back', nl: 'Terug' },
  'common.next': { de: 'Weiter', en: 'Next', nl: 'Volgende' },
  'quiz.preparing': { de: 'Quiz wird vorbereitet …', en: '', nl: '' },
  'quiz.error.selectFirst': { de: 'Bitte triff zuerst eine Auswahl.', en: '', nl: '' },
  'quiz.error.ageUnsupported': { de: 'Aktuell wird nur die Altersgruppe 0–1 Jahre unterstützt.', en: '', nl: '' },
  'admin.title': { de: 'Admin-Bereich', en: '', nl: '' },
  'admin.subtitle': { de: 'Hier werden Inhalte gepflegt und strukturiert verwaltet.', en: '', nl: '' },
};

export function t(key: string, locale: Locale, vars?: Record<string, string | number>) {
  const text = tr(uiTexts[key], locale, `[[missing:${key}]]`);
  if (!vars) return text;
  return Object.entries(vars).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, String(value)), text);
}
