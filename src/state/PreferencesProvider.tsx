import * as Haptics from 'expo-haptics';
import { getCalendars } from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import type { WeekStart } from '@/domain/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { i18n, resolveDeviceLanguage, type SupportedLanguage } from '@/i18n';
import { setAnalyticsEnabled } from '@/lib/telemetry/analytics';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type Preferences,
} from '@/storage/preferencesStorage';

export function deviceWeekStart(): WeekStart {
  try {
    // expo-localization: 1 = Sunday … 7 = Saturday.
    return getCalendars()[0]?.firstWeekday === 1 ? 0 : 1;
  } catch {
    return 1;
  }
}

export type HapticKind = 'increment' | 'decrement' | 'success' | 'limit' | 'select' | 'none';

type PreferencesValue = {
  hydrated: boolean;
  preferences: Preferences;
  language: SupportedLanguage;
  weekStart: WeekStart;
  reduceMotion: boolean;
  update: (patch: Partial<Preferences>) => Promise<void>;
  haptic: (kind: HapticKind) => void;
  reset: () => Promise<void>;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

function fireHaptic(kind: HapticKind): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }
  const run = () => {
    switch (kind) {
      case 'increment':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'decrement':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'limit':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'select':
        return Haptics.selectionAsync();
      default:
        return Promise.resolve();
    }
  };
  void run().catch(() => undefined);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const latest = useRef(preferences);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await loadPreferences();
        if (cancelled) {
          return;
        }
        latest.current = stored;
        setPreferences(stored);
        await i18n.changeLanguage(stored.language ?? resolveDeviceLanguage());
        await setAnalyticsEnabled(stored.analytics);
      } catch {
        // Defaults are safe; the user can change them again.
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (patch: Partial<Preferences>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setPreferences(next);
    if ('language' in patch) {
      await i18n.changeLanguage(next.language ?? resolveDeviceLanguage());
    }
    if ('analytics' in patch) {
      await setAnalyticsEnabled(next.analytics);
    }
    await savePreferences(next);
  }, []);

  const reset = useCallback(async () => {
    latest.current = DEFAULT_PREFERENCES;
    setPreferences(DEFAULT_PREFERENCES);
    await i18n.changeLanguage(resolveDeviceLanguage());
    await setAnalyticsEnabled(true);
  }, []);

  const haptic = useCallback((kind: HapticKind) => {
    if (latest.current.haptics) {
      fireHaptic(kind);
    }
  }, []);

  const language = (preferences.language ?? resolveDeviceLanguage()) as SupportedLanguage;
  const weekStart = preferences.weekStart ?? deviceWeekStart();

  const value = useMemo<PreferencesValue>(
    () => ({ hydrated, preferences, language, weekStart, reduceMotion, update, haptic, reset }),
    [hydrated, preferences, language, weekStart, reduceMotion, update, haptic, reset],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
