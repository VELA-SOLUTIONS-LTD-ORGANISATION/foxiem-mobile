import {
  isReminderDay,
  isReminderMessageKey,
  parseTimeString,
  type Reminder,
} from '@/state/reminders';

import { readJson, writeJson } from './appStorage';
import { STORAGE_KEYS } from './keys';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseReminder(value: unknown): Reminder | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, enabled, time, days, messageKey, notificationIds, createdAt } = value;
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof enabled !== 'boolean' ||
    typeof time !== 'string' ||
    !parseTimeString(time) ||
    !Array.isArray(days) ||
    days.length === 0 ||
    !days.every((day) => typeof day === 'string' && isReminderDay(day)) ||
    typeof messageKey !== 'string' ||
    !isReminderMessageKey(messageKey) ||
    typeof createdAt !== 'string' ||
    Number.isNaN(Date.parse(createdAt))
  ) {
    return null;
  }

  const parsedDays = days.filter((day): day is Reminder['days'][number] => {
    return typeof day === 'string' && isReminderDay(day);
  });

  const parsedIds = Array.isArray(notificationIds)
    ? notificationIds.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : typeof value.notificationId === 'string' && value.notificationId.length > 0
      ? [value.notificationId]
      : [];

  return {
    id,
    enabled,
    time,
    days: parsedDays,
    messageKey,
    notificationIds: parsedIds,
    createdAt,
  };
}

export function parseReminders(value: unknown): Reminder[] {
  if (value == null) {
    return [];
  }

  if (isRecord(value) && typeof value.enabled === 'boolean' && !Array.isArray(value.items)) {
    return [];
  }

  const list = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
      ? value.items
      : null;

  if (!list) {
    return [];
  }

  return list.flatMap((item) => {
    const reminder = parseReminder(item);
    return reminder ? [reminder] : [];
  });
}

export async function loadReminders(): Promise<Reminder[]> {
  const stored = await readJson<unknown>(STORAGE_KEYS.reminders);
  return parseReminders(stored);
}

export async function saveReminders(reminders: readonly Reminder[]): Promise<void> {
  await writeJson(STORAGE_KEYS.reminders, [...reminders]);
}
