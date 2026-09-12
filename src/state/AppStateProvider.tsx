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

import { i18n, resolveDeviceLanguage, type SupportedLanguage } from '@/i18n';
import {
  cancelReminderNotifications,
  cancelReminders,
  requestNotificationPermission,
  scheduleReminderNotifications,
  type NotificationPermissionState,
} from '@/notifications';
import { readJson, resetFoxiemAppData, writeJson } from '@/storage';
import {
  loadCounterEvents,
  loadCounterState,
  saveCounterEvents,
  saveCounterState,
} from '@/storage/counterStorage';
import { STORAGE_KEYS } from '@/storage/keys';
import { getStoredProfile, saveStoredProfile } from '@/storage/profileStorage';
import { loadReminders, saveReminders } from '@/storage/reminderStorage';
import { createLocalId } from '@/utils/id';

import { applyCounterAction, createLatestWinsPersistQueue } from './counterLogic';
import {
  type Reminder,
  type ReminderDraft,
} from './reminders';
import {
  DEFAULT_COUNTER,
  DEFAULT_COUNTER_EVENTS,
  type AppPreferences,
  type CounterEvent,
  type CounterState,
  type UserProfile,
} from './types';

export type ReminderMutationResult = {
  reminder: Reminder | null;
  permission: NotificationPermissionState;
};

type AppStateContextValue = {
  hydrated: boolean;
  setupCompleted: boolean;
  profile: UserProfile | null;
  preferences: AppPreferences;
  hasManualLanguage: boolean;
  counter: CounterState;
  counterEvents: CounterEvent[];
  reminders: Reminder[];
  completeSetup: (profile: UserProfile) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  incrementCounter: (amount: number) => Promise<void>;
  decrementCounter: (amount?: number) => Promise<void>;
  resetCounter: () => Promise<void>;
  addReminder: (draft: ReminderDraft) => Promise<ReminderMutationResult>;
  updateReminder: (id: string, draft: ReminderDraft) => Promise<ReminderMutationResult>;
  deleteReminder: (id: string) => Promise<void>;
  setReminderEnabled: (id: string, enabled: boolean) => Promise<ReminderMutationResult>;
  resetAppData: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseProfile(value: unknown): UserProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = value.name;
  const username = value.username;
  if (typeof name !== 'string' || typeof username !== 'string') {
    return null;
  }

  return { name, username };
}

function parsePreferences(value: unknown): AppPreferences | null {
  if (!isRecord(value)) {
    return null;
  }

  const language = value.language;
  if (typeof language !== 'string') {
    return null;
  }

  if (
    language !== 'en' &&
    language !== 'tr' &&
    language !== 'de' &&
    language !== 'fr' &&
    language !== 'es' &&
    language !== 'it'
  ) {
    return null;
  }

  return { language };
}

async function persistRemindersSafely(nextReminders: Reminder[]): Promise<void> {
  try {
    await saveReminders(nextReminders);
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to persist Foxiem reminders', error);
    }
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasManualLanguage, setHasManualLanguage] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>({
    language: resolveDeviceLanguage(),
  });
  const [counter, setCounterState] = useState<CounterState>(DEFAULT_COUNTER);
  const [counterEvents, setCounterEvents] = useState<CounterEvent[]>(DEFAULT_COUNTER_EVENTS);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const latestRef = useRef({
    counter: DEFAULT_COUNTER,
    events: DEFAULT_COUNTER_EVENTS,
    reminders: [] as Reminder[],
  });
  const persistQueueRef = useRef(
    createLatestWinsPersistQueue(async (snapshot) => {
      try {
        await Promise.all([saveCounterState(snapshot.counter), saveCounterEvents(snapshot.events)]);
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to persist Foxiem counter data', error);
        }
      }
    }),
  );

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const [storedProfile, storedPreferences, storedCounter, storedEvents, storedReminders, storedSetup] =
          await Promise.all([
            getStoredProfile(),
            readJson<unknown>(STORAGE_KEYS.preferences),
            loadCounterState(),
            loadCounterEvents(),
            loadReminders(),
            readJson<unknown>(STORAGE_KEYS.setupCompleted),
          ]);

        if (cancelled) {
          return;
        }

        const nextProfile = parseProfile(storedProfile);
        const nextPreferences = parsePreferences(storedPreferences);
        const language = nextPreferences?.language ?? resolveDeviceLanguage();

        latestRef.current = {
          counter: storedCounter,
          events: storedEvents,
          reminders: storedReminders,
        };
        setProfile(nextProfile);
        setHasManualLanguage(nextPreferences !== null);
        setPreferences({ language });
        setCounterState(storedCounter);
        setCounterEvents(storedEvents);
        setReminders(storedReminders);
        setSetupCompleted(storedSetup === true && nextProfile !== null);
        await i18n.changeLanguage(language);
      } catch (error) {
        if (__DEV__) {
          console.warn('Foxiem hydration failed', error);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistCounterSnapshot = useCallback((nextCounter: CounterState, nextEvents: CounterEvent[]) => {
    persistQueueRef.current.enqueue({ counter: nextCounter, events: nextEvents });
  }, []);

  const replaceReminders = useCallback(async (nextReminders: Reminder[]) => {
    latestRef.current = { ...latestRef.current, reminders: nextReminders };
    setReminders(nextReminders);
    await persistRemindersSafely(nextReminders);
  }, []);

  const completeSetup = useCallback(async (nextProfile: UserProfile) => {
    await Promise.all([
      saveStoredProfile(nextProfile),
      writeJson(STORAGE_KEYS.setupCompleted, true),
    ]);
    setProfile(nextProfile);
    setSetupCompleted(true);
  }, []);

  const updateProfile = useCallback(async (nextProfile: UserProfile) => {
    await saveStoredProfile(nextProfile);
    setProfile(nextProfile);
  }, []);

  const changeLanguage = useCallback(async (language: SupportedLanguage) => {
    const nextPreferences: AppPreferences = { language };
    await writeJson(STORAGE_KEYS.preferences, nextPreferences);
    setHasManualLanguage(true);
    setPreferences(nextPreferences);
    await i18n.changeLanguage(language);

    const nextReminders = await Promise.all(
      latestRef.current.reminders.map(async (reminder) => {
        if (!reminder.enabled) {
          return reminder;
        }

        const notificationIds = await scheduleReminderNotifications(reminder);
        return { ...reminder, notificationIds };
      }),
    );
    await replaceReminders(nextReminders);
  }, [replaceReminders]);

  const incrementCounter = useCallback(
    async (amount: number) => {
      const next = applyCounterAction(
        { counter: latestRef.current.counter, events: latestRef.current.events },
        { type: 'increment', amount },
      );
      if (!next) {
        return;
      }

      latestRef.current = { ...latestRef.current, counter: next.counter, events: next.events };
      setCounterState(next.counter);
      setCounterEvents(next.events);
      persistCounterSnapshot(next.counter, next.events);
    },
    [persistCounterSnapshot],
  );

  const decrementCounter = useCallback(
    async (amount = 1) => {
      const next = applyCounterAction(
        { counter: latestRef.current.counter, events: latestRef.current.events },
        { type: 'decrement', amount },
      );
      if (!next) {
        return;
      }

      latestRef.current = { ...latestRef.current, counter: next.counter, events: next.events };
      setCounterState(next.counter);
      setCounterEvents(next.events);
      persistCounterSnapshot(next.counter, next.events);
    },
    [persistCounterSnapshot],
  );

  const resetCounter = useCallback(async () => {
    const next = applyCounterAction(
      { counter: latestRef.current.counter, events: latestRef.current.events },
      { type: 'reset' },
    );
    if (!next) {
      return;
    }

    latestRef.current = { ...latestRef.current, counter: next.counter, events: next.events };
    setCounterState(next.counter);
    setCounterEvents(next.events);
    persistCounterSnapshot(next.counter, next.events);
  }, [persistCounterSnapshot]);

  const addReminder = useCallback(
    async (draft: ReminderDraft): Promise<ReminderMutationResult> => {
      const permission = await requestNotificationPermission();
      const enabled = permission === 'granted';
      const reminder: Reminder = {
        id: createLocalId(),
        enabled,
        time: draft.time,
        days: draft.days,
        messageKey: draft.messageKey,
        notificationIds: [],
        createdAt: new Date().toISOString(),
      };
      try {
        const notificationIds = enabled ? await scheduleReminderNotifications(reminder) : [];
        const saved = { ...reminder, notificationIds };
        await replaceReminders([...latestRef.current.reminders, saved]);
        return { reminder: saved, permission };
      } catch {
        return { reminder: null, permission };
      }
    },
    [replaceReminders],
  );

  const updateReminder = useCallback(
    async (id: string, draft: ReminderDraft): Promise<ReminderMutationResult> => {
      const current = latestRef.current.reminders.find((item) => item.id === id);
      if (!current) {
        return { reminder: null, permission: 'undetermined' };
      }

      let permission: NotificationPermissionState = 'granted';
      let enabled = current.enabled;
      if (enabled) {
        permission = await requestNotificationPermission();
        enabled = permission === 'granted';
      }

      const next: Reminder = {
        ...current,
        time: draft.time,
        days: draft.days,
        messageKey: draft.messageKey,
        enabled,
      };
      try {
        const notificationIds = enabled
          ? await scheduleReminderNotifications({ ...next, notificationIds: [] })
          : [];
        await cancelReminderNotifications(current.notificationIds);
        const saved = { ...next, notificationIds };
        await replaceReminders(
          latestRef.current.reminders.map((item) => (item.id === id ? saved : item)),
        );
        return { reminder: saved, permission };
      } catch {
        return { reminder: current, permission };
      }
    },
    [replaceReminders],
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      const current = latestRef.current.reminders.find((item) => item.id === id);
      if (!current) {
        return;
      }

      await cancelReminderNotifications(current.notificationIds);
      await replaceReminders(latestRef.current.reminders.filter((item) => item.id !== id));
    },
    [replaceReminders],
  );

  const setReminderEnabled = useCallback(
    async (id: string, enabled: boolean): Promise<ReminderMutationResult> => {
      const current = latestRef.current.reminders.find((item) => item.id === id);
      if (!current) {
        return { reminder: null, permission: 'undetermined' };
      }

      if (!enabled) {
        await cancelReminderNotifications(current.notificationIds);
        const saved = { ...current, enabled: false, notificationIds: [] };
        await replaceReminders(
          latestRef.current.reminders.map((item) => (item.id === id ? saved : item)),
        );
        return { reminder: saved, permission: 'granted' };
      }

      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        const saved = { ...current, enabled: false, notificationIds: [] };
        await replaceReminders(
          latestRef.current.reminders.map((item) => (item.id === id ? saved : item)),
        );
        return { reminder: saved, permission };
      }

      try {
        const notificationIds = await scheduleReminderNotifications({
          ...current,
          enabled: true,
          notificationIds: [],
        });
        await cancelReminderNotifications(current.notificationIds);
        const saved = { ...current, enabled: true, notificationIds };
        await replaceReminders(
          latestRef.current.reminders.map((item) => (item.id === id ? saved : item)),
        );
        return { reminder: saved, permission };
      } catch {
        const saved = { ...current, enabled: false, notificationIds: [] };
        await replaceReminders(
          latestRef.current.reminders.map((item) => (item.id === id ? saved : item)),
        );
        return { reminder: saved, permission };
      }
    },
    [replaceReminders],
  );

  const resetAppData = useCallback(async () => {
    await cancelReminders(latestRef.current.reminders);
    await resetFoxiemAppData();
    const language = resolveDeviceLanguage();
    const nextCounter = DEFAULT_COUNTER;
    const nextEvents = DEFAULT_COUNTER_EVENTS;
    latestRef.current = { counter: nextCounter, events: nextEvents, reminders: [] };
    setProfile(null);
    setSetupCompleted(false);
    setHasManualLanguage(false);
    setPreferences({ language });
    setCounterState(nextCounter);
    setCounterEvents(nextEvents);
    setReminders([]);
    await i18n.changeLanguage(language);
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      hydrated,
      setupCompleted,
      profile,
      preferences,
      hasManualLanguage,
      counter,
      counterEvents,
      reminders,
      completeSetup,
      updateProfile,
      changeLanguage,
      incrementCounter,
      decrementCounter,
      resetCounter,
      addReminder,
      updateReminder,
      deleteReminder,
      setReminderEnabled,
      resetAppData,
    }),
    [
      hydrated,
      setupCompleted,
      profile,
      preferences,
      hasManualLanguage,
      counter,
      counterEvents,
      reminders,
      completeSetup,
      updateProfile,
      changeLanguage,
      incrementCounter,
      decrementCounter,
      resetCounter,
      addReminder,
      updateReminder,
      deleteReminder,
      setReminderEnabled,
      resetAppData,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return context;
}
