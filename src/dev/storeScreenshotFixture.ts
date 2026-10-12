import { rebuildChain } from '@/domain/events';
import { addDays, startOfDay } from '@/domain/periods';
import { EVERY_DAY, WEEKDAY_DAYS, type Reminder } from '@/domain/reminders';
import { createTracker, emptyDraft } from '@/domain/trackers';
import type { CountEvent, Tracker, TrackerDraft } from '@/domain/types';
import type { SupportedLanguage } from '@/i18n';
import { FREE_ENTITLEMENT } from '@/pro/entitlement';
import { writeManyJson } from '@/storage/appStorage';
import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS, eventsKey, type StorageKey } from '@/storage/keys';
import { NOTICE_IDS } from '@/state/NoticesProvider';
import { DEFAULT_PREFERENCES, type Preferences } from '@/storage/preferencesStorage';

import { screenshotTrackerNames } from './storeScreenshotLocales';
import { isStoreScreenshotMode } from './storeScreenshotMode';

/** Stable ids so deep links and screenshots stay identical across runs. */
export const STORE_SCREENSHOT_TRACKER_ID = 'tracker.store.water';

type Sample = {
  id: string;
  draft: Partial<TrackerDraft>;
  perDay: (dayIndex: number, weekday: number) => number;
  hours: number[];
};

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const SAMPLES: Sample[] = [
  {
    id: STORE_SCREENSHOT_TRACKER_ID,
    draft: { name: 'Water', icon: 'cup-water', color: 'sky', intent: 'reach', period: 'day', target: 8, unit: 'glasses', templateId: 'water' },
    perDay: (day, weekday) => Math.round(5 + noise(day) * 4 + (weekday === 2 || weekday === 4 ? 1 : 0)),
    hours: [8, 11, 14, 17, 20],
  },
  {
    id: 'tracker.store.coffee',
    draft: { name: 'Coffee', icon: 'coffee-outline', color: 'cocoa', intent: 'limit', period: 'day', target: 3, templateId: 'coffee' },
    perDay: (day) => Math.round(1 + noise(day + 7) * 3),
    hours: [8, 13, 16],
  },
  {
    id: 'tracker.store.reading',
    draft: {
      name: 'Reading',
      icon: 'book-open-page-variant-outline',
      color: 'leaf',
      intent: 'reach',
      period: 'week',
      target: 150,
      unit: 'pages',
      step: 5,
      templateId: 'reading',
    },
    perDay: (day, weekday) => (weekday === 2 || weekday === 4 ? 35 : noise(day + 3) > 0.45 ? 15 : 0),
    hours: [21],
  },
  {
    id: 'tracker.store.workout',
    draft: { name: 'Workout', icon: 'dumbbell', color: 'iris', intent: 'consistency', period: 'week', target: 3 },
    perDay: (day, weekday) => (weekday === 1 || weekday === 3 || (weekday === 6 && noise(day) > 0.4) ? 1 : 0),
    hours: [18],
  },
];

export type StoreScreenshotState = {
  trackers: Tracker[];
  events: Record<string, CountEvent[]>;
  reminders: Reminder[];
  preferences: Preferences;
};

export function buildStoreScreenshotState(now: Date = new Date(), language: SupportedLanguage = 'en'): StoreScreenshotState {
  const names = screenshotTrackerNames(language);
  const days = 60;
  const start = addDays(startOfDay(now), -(days - 1));
  const created = addDays(start, -1);
  const all: Tracker[] = [];
  const events: Record<string, CountEvent[]> = {};

  SAMPLES.forEach((sample) => {
    const tracker = createTracker(
      emptyDraft({ ...sample.draft, name: names[sample.id] ?? sample.draft.name }),
      all,
      { now: created, id: sample.id, origin: sample.draft.templateId ? 'template' : 'custom' },
    );
    all.push(tracker);
    const raw: CountEvent[] = [];
    for (let day = 0; day < days; day += 1) {
      const date = addDays(start, day);
      const total = sample.perDay(day, date.getDay());
      if (total <= 0) {
        continue;
      }
      const slots = sample.hours.length;
      let remaining = total;
      sample.hours.forEach((hour, slot) => {
        const amount = slot === slots - 1 ? remaining : Math.floor(total / slots);
        remaining -= amount;
        const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, Math.round(noise(day + slot) * 50));
        if (amount > 0) {
          if (at.getTime() > now.getTime()) {
            at.setTime(now.getTime() - 60_000 * (slot + 1));
          }
          if (at.getTime() >= date.getTime() && at.getTime() <= now.getTime()) {
            raw.push({
              id: `${tracker.id}.${day}.${slot}`,
              trackerId: tracker.id,
              type: 'increment',
              amount,
              previousValue: 0,
              newValue: 0,
              createdAt: at.toISOString(),
              source: 'tap',
            });
          }
        }
      });
    }
    events[tracker.id] = rebuildChain(tracker.startingValue, raw);
  });

  const reminders: Reminder[] = [
    {
      id: 'reminder.store.checkin',
      trackerId: null,
      enabled: true,
      time: '20:00',
      days: WEEKDAY_DAYS,
      smart: false,
      messageKey: null,
      notificationIds: [],
      createdAt: created.toISOString(),
    },
    {
      id: 'reminder.store.water',
      trackerId: STORE_SCREENSHOT_TRACKER_ID,
      enabled: true,
      time: '08:30',
      days: EVERY_DAY,
      smart: false,
      messageKey: null,
      notificationIds: [],
      createdAt: created.toISOString(),
    },
  ];

  const preferences: Preferences = {
    ...DEFAULT_PREFERENCES,
    language,
    appearance: 'light',
    haptics: false,
    weekStart: 1,
    analyticsConsent: 'denied',
    analyticsConsentAt: created.toISOString(),
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
    widgetTrackerId: STORE_SCREENSHOT_TRACKER_ID,
  };

  return { trackers: all, events, reminders, preferences };
}

let pending: Promise<StoreScreenshotState> | null = null;
let pendingLanguage: SupportedLanguage | null = null;

/** Writes a clean anonymous fixture through the real storage keys, then returns it for in-memory hydrate. */
export async function ensureStoreScreenshotFixture(
  now: Date = new Date(),
  language: SupportedLanguage = 'en',
): Promise<StoreScreenshotState> {
  if (!isStoreScreenshotMode()) {
    throw new Error('Store screenshot fixture is only available in screenshot mode');
  }
  if (!pending || pendingLanguage !== language) {
    pendingLanguage = language;
    pending = persistStoreScreenshotFixture(now, language);
  }
  return pending;
}

async function persistStoreScreenshotFixture(now: Date, language: SupportedLanguage): Promise<StoreScreenshotState> {
  const state = buildStoreScreenshotState(now, language);
  const entries: [StorageKey, unknown][] = [
    [STORAGE_KEYS.schemaVersion, CURRENT_SCHEMA_VERSION],
    [STORAGE_KEYS.trackers, { schemaVersion: CURRENT_SCHEMA_VERSION, trackers: state.trackers }],
    [STORAGE_KEYS.firstRun, { completedAt: state.trackers[0]?.createdAt ?? now.toISOString() }],
    [STORAGE_KEYS.preferences, state.preferences],
    [STORAGE_KEYS.reminders, state.reminders],
    [STORAGE_KEYS.notices, { dismissed: [NOTICE_IDS.homeHint, NOTICE_IDS.whatsNewV3] }],
    [STORAGE_KEYS.entitlement, FREE_ENTITLEMENT],
  ];
  for (const tracker of state.trackers) {
    entries.push([eventsKey(tracker.id), state.events[tracker.id] ?? []]);
  }
  await writeManyJson(entries);
  return state;
}
