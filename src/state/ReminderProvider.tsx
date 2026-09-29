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
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { smartSchedule, standardReminderContent, type Translate } from '@/domain/reminderCopy';
import { canAddReminder, reminderAllowed, sortDays, type Reminder, type ReminderDraft } from '@/domain/reminders';
import type { CountEvent, Tracker } from '@/domain/types';
import { trackEvent } from '@/lib/telemetry/analytics';
import {
  cancelNotifications,
  configureReminderChannel,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleOccurrences,
  scheduleWeekly,
  type NotificationPermission,
} from '@/notifications';
import { usePro } from '@/pro/ProProvider';
import { loadReminders, saveReminders } from '@/storage';
import { createLocalId } from '@/utils/id';

import { usePreferences } from './PreferencesProvider';
import { useTrackerStore } from './TrackerStore';

export type ReminderSaveResult =
  | { status: 'saved'; reminder: Reminder }
  | { status: 'permission'; permission: NotificationPermission; reminder: Reminder }
  | { status: 'limit' }
  | { status: 'failed' };

type ReminderValue = {
  hydrated: boolean;
  reminders: Reminder[];
  permission: NotificationPermission;
  refreshPermission: () => Promise<NotificationPermission>;
  requestPermission: () => Promise<NotificationPermission>;
  remindersFor: (trackerId: string | null) => Reminder[];
  canAdd: (trackerId: string | null) => boolean;
  isActive: (reminder: Reminder) => boolean;
  save: (draft: ReminderDraft, existingId?: string) => Promise<ReminderSaveResult>;
  setEnabled: (reminderId: string, enabled: boolean) => Promise<ReminderSaveResult>;
  remove: (reminderId: string) => Promise<void>;
  cancelAll: () => Promise<void>;
  clearAll: () => void;
};

const ReminderContext = createContext<ReminderValue | null>(null);

const SMART_RESCHEDULE_DELAY_MS = 1500;

function activeFor(
  reminder: Reminder,
  all: readonly Reminder[],
  isPro: boolean,
  trackers: readonly Tracker[],
): boolean {
  if (!reminder.enabled || !reminderAllowed(reminder, all, isPro)) {
    return false;
  }
  if (reminder.trackerId === null) {
    return true;
  }
  const tracker = trackers.find((item) => item.id === reminder.trackerId);
  return Boolean(tracker && tracker.archivedAt === null);
}

/** What a reminder should look like when scheduled; a change means reschedule. */
function scheduleSignature(
  reminder: Reminder,
  tracker: Tracker | null,
  active: boolean,
  smart: boolean,
  contentKey: string,
): string {
  return JSON.stringify([active, smart, reminder.time, reminder.days, tracker?.archivedAt ?? null, contentKey]);
}

export function ReminderProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { weekStart } = usePreferences();
  const { trackers, events, hydrated: trackersHydrated } = useTrackerStore();
  const { isPro, hydrated: proHydrated } = usePro();
  const [hydrated, setHydrated] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const latest = useRef<Reminder[]>([]);
  const signatures = useRef(new Map<string, string>());
  const syncing = useRef<Promise<void>>(Promise.resolve());
  const channelLanguage = useRef<string | null>(null);
  const translate = t as unknown as Translate;

  const persist = useCallback(async (next: Reminder[]) => {
    latest.current = next;
    setReminders(next);
    try {
      await saveReminders(next);
    } catch {
      // Keep the in-memory state; the next change retries the write.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [stored, current] = await Promise.all([loadReminders(), getNotificationPermission()]);
        if (!cancelled) {
          latest.current = stored;
          setReminders(stored);
          setPermission(current);
        }
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

  const refreshPermission = useCallback(async () => {
    const current = await getNotificationPermission();
    setPermission(current);
    return current;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshPermission();
      }
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  const isActive = useCallback(
    (reminder: Reminder) => activeFor(reminder, reminders, isPro, trackers),
    [isPro, reminders, trackers],
  );

  /** Bring OS notifications in line with reminders; only touches reminders whose schedule changed. */
  const sync = useCallback(
    (options: { force?: boolean } = {}) => {
      syncing.current = syncing.current.then(async () => {
        const current = await getNotificationPermission();
        setPermission(current);
        if (channelLanguage.current !== i18n.language) {
          await configureReminderChannel(translate('reminders.channelName'));
          channelLanguage.current = i18n.language;
        }
        const now = new Date();
        let changed = false;
        const next: Reminder[] = [];
        for (const reminder of latest.current) {
          const tracker = reminder.trackerId ? trackers.find((item) => item.id === reminder.trackerId) ?? null : null;
          const active = current === 'granted' && activeFor(reminder, latest.current, isPro, trackers);
          const smart = active && reminder.smart && isPro && tracker !== null;
          const trackerEvents: readonly CountEvent[] = tracker ? events[tracker.id] ?? [] : [];
          const planned = smart && tracker ? smartSchedule(tracker, trackerEvents, reminder, { now, weekStart }, translate) : [];
          const standard = standardReminderContent(tracker, reminder, translate);
          const contentKey = smart
            ? JSON.stringify(planned.map((item) => [item.date.getTime(), item.content.body]))
            : JSON.stringify([standard.title, standard.body, i18n.language]);
          const signature = scheduleSignature(reminder, tracker, active, smart, contentKey);
          if (!options.force && signatures.current.get(reminder.id) === signature) {
            next.push(reminder);
            continue;
          }
          await cancelNotifications(reminder.notificationIds);
          let notificationIds: string[] = [];
          try {
            if (active) {
              notificationIds = smart
                ? await scheduleOccurrences(reminder, planned)
                : await scheduleWeekly(reminder, standard);
            }
            signatures.current.set(reminder.id, signature);
          } catch {
            signatures.current.delete(reminder.id);
          }
          changed = true;
          next.push({ ...reminder, notificationIds });
        }
        if (changed) {
          await persist(next);
        }
      });
      return syncing.current;
    },
    [events, i18n.language, isPro, persist, translate, trackers, weekStart],
  );

  const ready = hydrated && trackersHydrated && proHydrated;

  // Reminders for deleted trackers are removed; archived ones are paused by `isActive`.
  useEffect(() => {
    if (!ready) {
      return;
    }
    const known = new Set(trackers.map((tracker) => tracker.id));
    const orphans = latest.current.filter((reminder) => reminder.trackerId && !known.has(reminder.trackerId));
    if (orphans.length > 0) {
      void (async () => {
        await cancelNotifications(orphans.flatMap((reminder) => reminder.notificationIds));
        await persist(latest.current.filter((reminder) => !orphans.includes(reminder)));
      })();
    }
  }, [persist, ready, trackers]);

  const syncRef = useRef(sync);
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const timer = setTimeout(() => {
      void syncRef.current();
    }, SMART_RESCHEDULE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, events, trackers, isPro, i18n.language, weekStart, reminders, permission]);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const save = useCallback(
    async (draft: ReminderDraft, existingId?: string): Promise<ReminderSaveResult> => {
      const existing = existingId ? latest.current.find((item) => item.id === existingId) : undefined;
      if (!existing && !canAddReminder(draft.trackerId, latest.current, isPro)) {
        return { status: 'limit' };
      }
      const granted = await requestNotificationPermission();
      setPermission(granted);
      const reminder: Reminder = {
        id: existing?.id ?? createLocalId(),
        trackerId: draft.trackerId,
        enabled: true,
        time: draft.time,
        days: sortDays(draft.days),
        smart: draft.smart && isPro,
        messageKey: existing?.messageKey ?? null,
        notificationIds: existing?.notificationIds ?? [],
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      const next = existing
        ? latest.current.map((item) => (item.id === existing.id ? reminder : item))
        : [...latest.current, reminder];
      await persist(next);
      signatures.current.delete(reminder.id);
      await sync();
      if (!existing) {
        void trackEvent('reminder_enabled', {
          kind: reminder.trackerId ? 'tracker' : 'general',
          smart: reminder.smart ? 'yes' : 'no',
        });
      }
      const saved = latest.current.find((item) => item.id === reminder.id) ?? reminder;
      if (granted !== 'granted') {
        return { status: 'permission', permission: granted, reminder: saved };
      }
      return { status: 'saved', reminder: saved };
    },
    [isPro, persist, sync],
  );

  const setEnabled = useCallback(
    async (reminderId: string, enabled: boolean): Promise<ReminderSaveResult> => {
      const existing = latest.current.find((item) => item.id === reminderId);
      if (!existing) {
        return { status: 'failed' };
      }
      let granted: NotificationPermission = permission;
      if (enabled) {
        granted = await requestNotificationPermission();
        setPermission(granted);
      }
      const reminder = { ...existing, enabled };
      await persist(latest.current.map((item) => (item.id === reminderId ? reminder : item)));
      signatures.current.delete(reminderId);
      await sync();
      if (enabled && granted !== 'granted') {
        return { status: 'permission', permission: granted, reminder };
      }
      return { status: 'saved', reminder };
    },
    [permission, persist, sync],
  );

  const remove = useCallback(
    async (reminderId: string) => {
      const existing = latest.current.find((item) => item.id === reminderId);
      if (!existing) {
        return;
      }
      await cancelNotifications(existing.notificationIds);
      signatures.current.delete(reminderId);
      await persist(latest.current.filter((item) => item.id !== reminderId));
    },
    [persist],
  );

  const cancelAll = useCallback(async () => {
    await cancelNotifications(latest.current.flatMap((reminder) => reminder.notificationIds));
  }, []);

  const clearAll = useCallback(() => {
    latest.current = [];
    signatures.current.clear();
    setReminders([]);
  }, []);

  const remindersFor = useCallback(
    (trackerId: string | null) => reminders.filter((reminder) => reminder.trackerId === trackerId),
    [reminders],
  );

  const canAdd = useCallback(
    (trackerId: string | null) => canAddReminder(trackerId, reminders, isPro),
    [isPro, reminders],
  );

  const value = useMemo<ReminderValue>(
    () => ({
      hydrated,
      reminders,
      permission,
      refreshPermission,
      requestPermission,
      remindersFor,
      canAdd,
      isActive,
      save,
      setEnabled,
      remove,
      cancelAll,
      clearAll,
    }),
    [hydrated, reminders, permission, refreshPermission, requestPermission, remindersFor, canAdd, isActive, save, setEnabled, remove, cancelAll, clearAll],
  );

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>;
}

export function useReminders(): ReminderValue {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within ReminderProvider');
  }
  return context;
}
