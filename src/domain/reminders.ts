export const REMINDER_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type ReminderDay = (typeof REMINDER_DAYS)[number];

/** Message presets from 1.0.x general reminders; kept so those reminders read the same. */
export const LEGACY_REMINDER_MESSAGE_KEYS = [
  'notifications.messages.daily',
  'notifications.messages.momentum',
  'notifications.messages.progress',
] as const;

export type LegacyReminderMessageKey = (typeof LEGACY_REMINDER_MESSAGE_KEYS)[number];

export type Reminder = {
  id: string;
  /** null = a general check-in reminder not tied to one tracker. */
  trackerId: string | null;
  enabled: boolean;
  time: string;
  days: ReminderDay[];
  /** Pro: progress-aware copy, skipped once the goal for the period is met. */
  smart: boolean;
  /** Present only on reminders created by Foxiem 1.0.x. */
  messageKey: LegacyReminderMessageKey | null;
  notificationIds: string[];
  createdAt: string;
};

export type ReminderDraft = {
  trackerId: string | null;
  time: string;
  days: ReminderDay[];
  smart: boolean;
};

export const FREE_REMINDERS_PER_TRACKER = 1;
export const PRO_REMINDERS_PER_TRACKER = 5;
export const DEFAULT_REMINDER_TIME = '20:00';

export const WEEKDAY_DAYS: ReminderDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export const WEEKEND_DAYS: ReminderDay[] = ['saturday', 'sunday'];
export const EVERY_DAY: ReminderDay[] = [...REMINDER_DAYS];

export function isReminderDay(value: unknown): value is ReminderDay {
  return typeof value === 'string' && (REMINDER_DAYS as readonly string[]).includes(value);
}

export function isLegacyMessageKey(value: unknown): value is LegacyReminderMessageKey {
  return typeof value === 'string' && (LEGACY_REMINDER_MESSAGE_KEYS as readonly string[]).includes(value);
}

export function parseTimeString(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatTimeString(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export type RepeatPreset = 'everyDay' | 'weekdays' | 'weekends' | 'custom';

function sameDays(left: readonly ReminderDay[], right: readonly ReminderDay[]): boolean {
  return left.length === right.length && left.every((day) => right.includes(day));
}

export function repeatPreset(days: readonly ReminderDay[]): RepeatPreset {
  if (sameDays(days, EVERY_DAY)) {
    return 'everyDay';
  }
  if (sameDays(days, WEEKDAY_DAYS)) {
    return 'weekdays';
  }
  if (sameDays(days, WEEKEND_DAYS)) {
    return 'weekends';
  }
  return 'custom';
}

export function sortDays(days: readonly ReminderDay[]): ReminderDay[] {
  return REMINDER_DAYS.filter((day) => days.includes(day));
}

/** JS `getDay()` index for a reminder day. */
export function jsWeekday(day: ReminderDay): number {
  return day === 'sunday' ? 0 : REMINDER_DAYS.indexOf(day) + 1;
}

function byCreated(left: Reminder, right: Reminder): number {
  const delta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  return delta !== 0 ? delta : left.id.localeCompare(right.id);
}

/**
 * Whether a reminder may run on the Free plan. 1.0.x reminders are grandfathered; otherwise
 * the oldest reminder per tracker (and one general check-in) stays active. Nothing is deleted.
 */
export function reminderAllowed(reminder: Reminder, all: readonly Reminder[], isPro: boolean): boolean {
  if (isPro || reminder.messageKey !== null) {
    return true;
  }
  const siblings = all
    .filter((item) => item.trackerId === reminder.trackerId && item.messageKey === null)
    .sort(byCreated);
  return siblings.slice(0, FREE_REMINDERS_PER_TRACKER).some((item) => item.id === reminder.id);
}

export function canAddReminder(trackerId: string | null, all: readonly Reminder[], isPro: boolean): boolean {
  const count = all.filter((item) => item.trackerId === trackerId && item.messageKey === null).length;
  return count < (isPro ? PRO_REMINDERS_PER_TRACKER : FREE_REMINDERS_PER_TRACKER);
}

/** Next `limit` occurrences strictly after `now`, within `horizonDays`. */
export function upcomingOccurrences(
  reminder: Pick<Reminder, 'time' | 'days'>,
  now: Date,
  limit = 7,
  horizonDays = 8,
): Date[] {
  const time = parseTimeString(reminder.time);
  if (!time || reminder.days.length === 0) {
    return [];
  }
  const weekdays = new Set(reminder.days.map(jsWeekday));
  const occurrences: Date[] = [];
  for (let offset = 0; offset <= horizonDays && occurrences.length < limit; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, time.hour, time.minute);
    if (date.getTime() > now.getTime() && weekdays.has(date.getDay())) {
      occurrences.push(date);
    }
  }
  return occurrences;
}
