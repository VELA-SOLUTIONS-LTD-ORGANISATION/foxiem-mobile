/**
 * The one registry of Pro capabilities. Screens ask `useFeature(key)`; nothing else
 * decides what needs Pro. Everything not listed here is Free.
 */
export const PRO_FEATURES = {
  patterns: { icon: 'pulse-outline' },
  crossTracker: { icon: 'git-compare-outline' },
  pace: { icon: 'speedometer-outline' },
  trends: { icon: 'trending-up-outline' },
  fullHistory: { icon: 'calendar-outline' },
  weeklyReview: { icon: 'reader-outline' },
  monthlyReview: { icon: 'albums-outline' },
  multipleReminders: { icon: 'alarm-outline' },
  smartReminders: { icon: 'notifications-outline' },
  reports: { icon: 'document-text-outline' },
  quietHours: { icon: 'moon-outline' },
  widgets: { icon: 'apps-outline' },
  watch: { icon: 'watch-outline' },
} as const;

export type ProFeature = keyof typeof PRO_FEATURES;

export function isProFeature(value: unknown): value is ProFeature {
  return typeof value === 'string' && value in PRO_FEATURES;
}

/** How many months back Free users can browse in the calendar (0 = current month). */
export const FREE_CALENDAR_MONTHS_BACK = 1;
