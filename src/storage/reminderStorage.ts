import {
  isLegacyMessageKey,
  isReminderDay,
  parseTimeString,
  sortDays,
  type Reminder,
} from '@/domain/reminders';

import { readJson, writeJson } from './appStorage';
import { STORAGE_KEYS } from './keys';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads both 1.0.x reminders (no tracker, message preset) and current ones. */
export function parseReminder(value: unknown): Reminder | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, enabled, time, days, createdAt } = value;
  if (
    typeof id !== 'string' ||
    !id ||
    typeof enabled !== 'boolean' ||
    typeof time !== 'string' ||
    !parseTimeString(time) ||
    !Array.isArray(days) ||
    typeof createdAt !== 'string' ||
    Number.isNaN(Date.parse(createdAt))
  ) {
    return null;
  }
  const parsedDays = sortDays(days.filter(isReminderDay));
  if (parsedDays.length === 0) {
    return null;
  }
  const messageKey = isLegacyMessageKey(value.messageKey) ? value.messageKey : null;
  const hasTracker = typeof value.trackerId === 'string' && value.trackerId.length > 0;
  const notificationIds = Array.isArray(value.notificationIds)
    ? value.notificationIds.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : typeof value.notificationId === 'string' && value.notificationId
      ? [value.notificationId]
      : [];
  return {
    id,
    trackerId: hasTracker ? (value.trackerId as string) : null,
    enabled,
    time,
    days: parsedDays,
    smart: value.smart === true,
    // A reminder without a tracker and without the new fields came from 1.0.x.
    messageKey: messageKey ?? (!hasTracker && !('smart' in value) ? 'notifications.messages.daily' : null),
    notificationIds,
    createdAt,
  };
}

export function parseReminders(value: unknown): Reminder[] {
  const list = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.items) ? value.items : [];
  const seen = new Set<string>();
  const reminders: Reminder[] = [];
  for (const item of list) {
    const reminder = parseReminder(item);
    if (reminder && !seen.has(reminder.id)) {
      seen.add(reminder.id);
      reminders.push(reminder);
    }
  }
  return reminders;
}

export async function loadReminders(): Promise<Reminder[]> {
  return parseReminders(await readJson<unknown>(STORAGE_KEYS.reminders));
}

export async function saveReminders(reminders: readonly Reminder[]): Promise<void> {
  await writeJson(STORAGE_KEYS.reminders, [...reminders]);
}
