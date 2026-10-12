import { resources, type SupportedLanguage } from '@/i18n';

/** Store listing locales. App UI codes are the language part (`en`, `tr`, …). */
export const STORE_SCREENSHOT_LOCALES = ['en-GB', 'tr-TR', 'de-DE', 'fr-FR', 'es-ES', 'it-IT'] as const;

export type StoreScreenshotLocale = (typeof STORE_SCREENSHOT_LOCALES)[number];

const WORKOUT_NAME: Record<SupportedLanguage, string> = {
  en: 'Workout',
  tr: 'Antrenman',
  de: 'Training',
  fr: 'Entraînement',
  es: 'Entrenamiento',
  it: 'Allenamento',
};

export function isStoreScreenshotLocale(value: string | null | undefined): value is StoreScreenshotLocale {
  return value != null && (STORE_SCREENSHOT_LOCALES as readonly string[]).includes(value);
}

/** `de-DE`, `de` or `DE` → app language. Unknown values fall back to English. */
export function storeLocaleToAppLanguage(value: string | null | undefined): SupportedLanguage {
  if (!value) {
    return 'en';
  }
  const lower = value.trim().toLowerCase().replace('_', '-');
  const language = lower.split('-')[0];
  if (language === 'en' || language === 'tr' || language === 'de' || language === 'fr' || language === 'es' || language === 'it') {
    return language;
  }
  return 'en';
}

export function appLanguageToStoreLocale(language: SupportedLanguage): StoreScreenshotLocale {
  switch (language) {
    case 'tr':
      return 'tr-TR';
    case 'de':
      return 'de-DE';
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    case 'it':
      return 'it-IT';
    default:
      return 'en-GB';
  }
}

export function resolveStoreScreenshotLocale(value: string | null | undefined): StoreScreenshotLocale {
  const trimmed = value?.trim();
  if (trimmed && isStoreScreenshotLocale(trimmed)) {
    return trimmed;
  }
  return appLanguageToStoreLocale(storeLocaleToAppLanguage(trimmed));
}

export function screenshotTrackerNames(language: SupportedLanguage): Record<string, string> {
  const templates = resources[language].translation.start.templates;
  return {
    'tracker.store.water': templates.water,
    'tracker.store.coffee': templates.coffee,
    'tracker.store.reading': templates.reading,
    'tracker.store.workout': WORKOUT_NAME[language],
  };
}
