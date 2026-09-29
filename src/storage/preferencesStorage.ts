import type { WeekStart } from '@/domain/types';
import { isSupportedLanguage, type SupportedLanguage } from '@/i18n/languages';

import { readJson, writeJson } from './appStorage';
import { STORAGE_KEYS } from './keys';

export type Appearance = 'system' | 'light' | 'dark';

export type Preferences = {
  /** null follows the device language. */
  language: SupportedLanguage | null;
  appearance: Appearance;
  haptics: boolean;
  /** null follows the device calendar. */
  weekStart: WeekStart | null;
  /** Anonymous measurement events (Firebase). */
  analytics: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  language: null,
  appearance: 'system',
  haptics: true,
  weekStart: null,
  analytics: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Accepts the 1.0.x `{ language }` shape as well as the current one. */
export function parsePreferences(value: unknown): Preferences {
  if (!isRecord(value)) {
    return { ...DEFAULT_PREFERENCES };
  }
  return {
    language: typeof value.language === 'string' && isSupportedLanguage(value.language) ? value.language : null,
    appearance:
      value.appearance === 'light' || value.appearance === 'dark' || value.appearance === 'system'
        ? value.appearance
        : 'system',
    haptics: value.haptics !== false,
    weekStart: value.weekStart === 0 || value.weekStart === 1 ? value.weekStart : null,
    analytics: value.analytics !== false,
  };
}

export async function loadPreferences(): Promise<Preferences> {
  return parsePreferences(await readJson<unknown>(STORAGE_KEYS.preferences));
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  await writeJson(STORAGE_KEYS.preferences, preferences);
}

export type Notices = {
  dismissed: string[];
};

export async function loadNotices(): Promise<Notices> {
  const value = await readJson<unknown>(STORAGE_KEYS.notices);
  if (isRecord(value) && Array.isArray(value.dismissed)) {
    return { dismissed: value.dismissed.filter((item): item is string => typeof item === 'string') };
  }
  return { dismissed: [] };
}

export async function saveNotices(notices: Notices): Promise<void> {
  await writeJson(STORAGE_KEYS.notices, notices);
}
