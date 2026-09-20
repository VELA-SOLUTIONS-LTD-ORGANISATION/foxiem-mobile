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
import { logAdsConversion } from '@/lib/telemetry/adsConversions';
import {
  cancelReminderNotifications,
  cancelReminders,
  requestNotificationPermission,
  scheduleReminderNotifications,
  type NotificationPermissionState,
} from '@/notifications';
import {
  createFreshCounterDomain,
  loadOrMigrateCounterDomain,
  readJson,
  resetFoxiemAppData,
  saveCounterDomain,
  writeJson,
} from '@/storage';
import { STORAGE_KEYS } from '@/storage/keys';
import { getStoredProfile, saveStoredProfile } from '@/storage/profileStorage';
import { loadReminders, saveReminders } from '@/storage/reminderStorage';
import { createLocalId } from '@/utils/id';

import { applyActionToDomain, createLatestWinsPersistQueue } from './counterLogic';
import {
  type Reminder,
  type ReminderDraft,
} from './reminders';
import {
  createCustomTopic,
  eventsForTopic,
  getActiveTopic,
  hasLifetimeIncrement,
  orderTopics,
  resolveActiveTopicId,
  validateTopicName,
  type TopicNameError,
} from './topics';
import {
  type AppPreferences,
  type CounterDomainSnapshot,
  type CounterEvent,
  type CounterState,
  type CounterTopic,
  type UserProfile,
} from './types';

export type ReminderMutationResult = {
  reminder: Reminder | null;
  permission: NotificationPermissionState;
};

export type TopicMutationResult = {
  topic: CounterTopic | null;
  error: TopicNameError | null;
};

type AppStateContextValue = {
  hydrated: boolean;
  setupCompleted: boolean;
  profile: UserProfile | null;
  preferences: AppPreferences;
  hasManualLanguage: boolean;
  topics: CounterTopic[];
  activeTopicId: string;
  activeTopic: CounterTopic;
  counter: CounterState;
  counterEvents: CounterEvent[];
  reminders: Reminder[];
  completeSetup: (profile: UserProfile) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  createTopic: (name: string) => TopicMutationResult;
  renameTopic: (topicId: string, name: string) => TopicMutationResult;
  selectTopic: (topicId: string) => void;
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

function snapshotFromLatest(
  topics: CounterTopic[],
  activeTopicId: string,
  events: CounterEvent[],
): CounterDomainSnapshot {
  return {
    schemaVersion: 2,
    activeTopicId: resolveActiveTopicId(topics, activeTopicId),
    topics: orderTopics(topics),
    events,
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const fresh = createFreshCounterDomain();
  const [hydrated, setHydrated] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasManualLanguage, setHasManualLanguage] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>({
    language: resolveDeviceLanguage(),
  });
  const [topics, setTopics] = useState<CounterTopic[]>(fresh.topics);
  const [activeTopicId, setActiveTopicId] = useState(fresh.activeTopicId);
  const [allEvents, setAllEvents] = useState<CounterEvent[]>(fresh.events);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const latestRef = useRef({
    topics: fresh.topics,
    activeTopicId: fresh.activeTopicId,
    events: fresh.events,
    reminders: [] as Reminder[],
  });
  const persistQueueRef = useRef(
    createLatestWinsPersistQueue<CounterDomainSnapshot>(async (snapshot) => {
      try {
        await saveCounterDomain(snapshot);
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to persist Foxiem counter data', error);
        }
      }
    }),
  );

  const persistDomain = useCallback((nextTopics: CounterTopic[], nextActiveId: string, nextEvents: CounterEvent[]) => {
    persistQueueRef.current.enqueue(snapshotFromLatest(nextTopics, nextActiveId, nextEvents));
  }, []);

  const commitDomain = useCallback(
    (nextTopics: CounterTopic[], nextActiveId: string, nextEvents: CounterEvent[]) => {
      const ordered = orderTopics(nextTopics);
      const resolvedId = resolveActiveTopicId(ordered, nextActiveId);
      latestRef.current = {
        ...latestRef.current,
        topics: ordered,
        activeTopicId: resolvedId,
        events: nextEvents,
      };
      setTopics(ordered);
      setActiveTopicId(resolvedId);
      setAllEvents(nextEvents);
      persistDomain(ordered, resolvedId, nextEvents);
    },
    [persistDomain],
  );

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const [storedProfile, storedPreferences, storedDomain, storedReminders, storedSetup] =
          await Promise.all([
            getStoredProfile(),
            readJson<unknown>(STORAGE_KEYS.preferences),
            loadOrMigrateCounterDomain(),
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
          topics: storedDomain.topics,
          activeTopicId: storedDomain.activeTopicId,
          events: storedDomain.events,
          reminders: storedReminders,
        };
        setProfile(nextProfile);
        setHasManualLanguage(nextPreferences !== null);
        setPreferences({ language });
        setTopics(storedDomain.topics);
        setActiveTopicId(storedDomain.activeTopicId);
        setAllEvents(storedDomain.events);
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
    void logAdsConversion('onboarding_complete');
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

  const applyToTopic = useCallback(
    (topicId: string, action: Parameters<typeof applyActionToDomain>[2]) => {
      const current = latestRef.current;
      const next = applyActionToDomain(
        snapshotFromLatest(current.topics, current.activeTopicId, current.events),
        topicId,
        action,
      );
      if (!next) {
        return null;
      }

      commitDomain(next.topics, current.activeTopicId, next.events);
      return next;
    },
    [commitDomain],
  );

  const incrementCounter = useCallback(
    async (amount: number) => {
      const topicId = latestRef.current.activeTopicId;
      const hadIncrement = hasLifetimeIncrement(latestRef.current.events);
      const next = applyToTopic(topicId, { type: 'increment', amount });
      if (!next) {
        return;
      }
      if (!hadIncrement) {
        void logAdsConversion('first_count');
      }
    },
    [applyToTopic],
  );

  const decrementCounter = useCallback(
    async (amount = 1) => {
      const topicId = latestRef.current.activeTopicId;
      applyToTopic(topicId, { type: 'decrement', amount });
    },
    [applyToTopic],
  );

  const resetCounter = useCallback(async () => {
    const topicId = latestRef.current.activeTopicId;
    applyToTopic(topicId, { type: 'reset' });
  }, [applyToTopic]);

  const createTopic = useCallback((name: string): TopicMutationResult => {
    const error = validateTopicName(name, latestRef.current.topics, {
      translate: (key) => i18n.t(key),
    });
    if (error) {
      return { topic: null, error };
    }

    const topic = createCustomTopic(name);
    commitDomain([...latestRef.current.topics, topic], topic.id, latestRef.current.events);
    return { topic, error: null };
  }, [commitDomain]);

  const renameTopic = useCallback((topicId: string, name: string): TopicMutationResult => {
    const current = latestRef.current.topics.find((topic) => topic.id === topicId);
    if (!current || current.kind === 'default') {
      return { topic: current ?? null, error: 'reserved' };
    }

    const error = validateTopicName(name, latestRef.current.topics, {
      excludeTopicId: topicId,
      translate: (key) => i18n.t(key),
    });
    if (error) {
      return { topic: current, error };
    }

    const now = new Date().toISOString();
    const next: CounterTopic = {
      ...current,
      name: name.trim().normalize('NFC'),
      updatedAt: now,
    };
    commitDomain(
      latestRef.current.topics.map((topic) => (topic.id === topicId ? next : topic)),
      latestRef.current.activeTopicId,
      latestRef.current.events,
    );
    return { topic: next, error: null };
  }, [commitDomain]);

  const selectTopic = useCallback((topicId: string) => {
    const resolved = resolveActiveTopicId(latestRef.current.topics, topicId);
    commitDomain(latestRef.current.topics, resolved, latestRef.current.events);
  }, [commitDomain]);

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
    const nextDomain = createFreshCounterDomain();
    latestRef.current = {
      topics: nextDomain.topics,
      activeTopicId: nextDomain.activeTopicId,
      events: nextDomain.events,
      reminders: [],
    };
    setProfile(null);
    setSetupCompleted(false);
    setHasManualLanguage(false);
    setPreferences({ language });
    setTopics(nextDomain.topics);
    setActiveTopicId(nextDomain.activeTopicId);
    setAllEvents(nextDomain.events);
    setReminders([]);
    await i18n.changeLanguage(language);
  }, []);

  const activeTopic = getActiveTopic(topics, activeTopicId);
  const counter: CounterState = { currentCount: activeTopic.currentCount };
  const counterEvents = eventsForTopic(allEvents, activeTopic.id);

  const value = useMemo<AppStateContextValue>(
    () => ({
      hydrated,
      setupCompleted,
      profile,
      preferences,
      hasManualLanguage,
      topics,
      activeTopicId: activeTopic.id,
      activeTopic,
      counter,
      counterEvents,
      reminders,
      completeSetup,
      updateProfile,
      changeLanguage,
      createTopic,
      renameTopic,
      selectTopic,
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
      topics,
      activeTopic,
      counter,
      counterEvents,
      reminders,
      completeSetup,
      updateProfile,
      changeLanguage,
      createTopic,
      renameTopic,
      selectTopic,
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
