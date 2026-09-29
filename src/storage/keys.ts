/** Every Foxiem-owned AsyncStorage key starts with this prefix; Reset removes exactly these. */
export const FOXIEM_KEY_PREFIX = 'foxiem.';

export const STORAGE_KEYS = {
  // v3 (current)
  schemaVersion: 'foxiem.schemaVersion',
  trackers: 'foxiem.trackers',
  preferences: 'foxiem.preferences',
  reminders: 'foxiem.reminders',
  firstRun: 'foxiem.firstRun',
  notices: 'foxiem.notices',
  entitlement: 'foxiem.entitlement',
  recovery: 'foxiem.recovery',
  /** Development builds only: state of the simulated store. */
  devStore: 'foxiem.devStore',
  // Legacy, read during migration and then kept untouched as a backup.
  legacyProfile: 'foxiem.profile',
  legacyCounter: 'foxiem.counter',
  legacyHistory: 'foxiem.history',
  legacyCounterDomain: 'foxiem.counterDomain',
  legacyTopicMigrationVersion: 'foxiem.topicMigrationVersion',
  legacySetupCompleted: 'foxiem.setupCompleted',
} as const;

export const EVENTS_KEY_PREFIX = 'foxiem.events.';

export function eventsKey(trackerId: string): `foxiem.events.${string}` {
  return `foxiem.events.${trackerId}`;
}

export const CURRENT_SCHEMA_VERSION = 3;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | `foxiem.events.${string}`;
