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

export const REMINDER_MESSAGE_KEYS = [
  'notifications.messages.daily',
  'notifications.messages.momentum',
  'notifications.messages.progress',
] as const;

export type ReminderMessageKey = (typeof REMINDER_MESSAGE_KEYS)[number];

export type RepeatPreset = 'everyDay' | 'weekdays' | 'weekends' | 'custom';

export type Reminder = {
  id: string;
  enabled: boolean;
  time: string;
  days: ReminderDay[];
  messageKey: ReminderMessageKey;
  notificationIds: string[];
  createdAt: string;
};

export type ReminderDraft = {
  time: string;
  days: ReminderDay[];
  messageKey: ReminderMessageKey;
};

export const WEEKDAY_DAYS: ReminderDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

export const WEEKEND_DAYS: ReminderDay[] = ['saturday', 'sunday'];

export const EVERY_DAY: ReminderDay[] = [...REMINDER_DAYS];

export const DEFAULT_REMINDER_TIME = '08:00';

export function isReminderDay(value: string): value is ReminderDay {
  return REMINDER_DAYS.some((day) => day === value);
}

export function isReminderMessageKey(value: string): value is ReminderMessageKey {
  return REMINDER_MESSAGE_KEYS.some((key) => key === value);
}

export function parseTimeString(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function formatTimeString(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function sameDays(left: readonly ReminderDay[], right: readonly ReminderDay[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((day) => right.includes(day));
}

export function getRepeatPreset(days: readonly ReminderDay[]): RepeatPreset {
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

export function daysForPreset(preset: RepeatPreset, customDays: readonly ReminderDay[]): ReminderDay[] {
  if (preset === 'everyDay') {
    return [...EVERY_DAY];
  }

  if (preset === 'weekdays') {
    return [...WEEKDAY_DAYS];
  }

  if (preset === 'weekends') {
    return [...WEEKEND_DAYS];
  }

  return REMINDER_DAYS.filter((day) => customDays.includes(day));
}
