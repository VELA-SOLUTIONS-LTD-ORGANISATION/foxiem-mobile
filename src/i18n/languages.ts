export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    label: 'English',
  },
  {
    code: 'tr',
    label: 'Türkçe',
  },
  {
    code: 'de',
    label: 'Deutsch',
  },
  {
    code: 'fr',
    label: 'Français',
  },
  {
    code: 'es',
    label: 'Español',
  },
  {
    code: 'it',
    label: 'Italiano',
  },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}
