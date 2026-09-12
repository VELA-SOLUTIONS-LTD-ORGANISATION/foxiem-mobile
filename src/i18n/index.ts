import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type SupportedLanguage,
} from './languages';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import tr from './locales/tr.json';

export const resources = {
  en: { translation: en },
  tr: { translation: tr },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  it: { translation: it },
} as const;

export function resolveDeviceLanguage(): SupportedLanguage {
  const languageCode = getLocales()[0]?.languageCode;
  if (languageCode && isSupportedLanguage(languageCode)) {
    return languageCode;
  }

  return DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export { i18n };
export { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, isSupportedLanguage } from './languages';
export type { SupportedLanguage } from './languages';
