export const LOCAL_DATA_CATEGORY_KEYS = [
  'privacy.data.name',
  'privacy.data.username',
  'privacy.data.language',
  'privacy.data.counter',
  'privacy.data.history',
  'privacy.data.reminders',
  'privacy.data.notificationIds',
  'privacy.data.setupCompleted',
] as const;

export type LocalDataCategoryKey = (typeof LOCAL_DATA_CATEGORY_KEYS)[number];
