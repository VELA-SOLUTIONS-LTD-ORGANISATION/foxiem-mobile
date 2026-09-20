export const STORAGE_KEYS = {
  profile: 'foxiem.profile',
  preferences: 'foxiem.preferences',
  counter: 'foxiem.counter',
  history: 'foxiem.history',
  counterDomain: 'foxiem.counterDomain',
  topicMigrationVersion: 'foxiem.topicMigrationVersion',
  reminders: 'foxiem.reminders',
  setupCompleted: 'foxiem.setupCompleted',
} as const;

export const FOXIEM_STORAGE_KEYS = [
  STORAGE_KEYS.profile,
  STORAGE_KEYS.preferences,
  STORAGE_KEYS.counter,
  STORAGE_KEYS.history,
  STORAGE_KEYS.counterDomain,
  STORAGE_KEYS.topicMigrationVersion,
  STORAGE_KEYS.reminders,
  STORAGE_KEYS.setupCompleted,
] as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
