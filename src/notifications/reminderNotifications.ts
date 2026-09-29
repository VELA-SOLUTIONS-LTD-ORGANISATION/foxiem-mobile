import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { jsWeekday, parseTimeString, type ReminderDay } from '@/domain/reminders';

export const FOXIEM_REMINDER_CHANNEL = 'foxiem-reminders';

/** `blocked` means the OS will not show the prompt again; only Settings can change it. */
export type NotificationPermission = 'granted' | 'undetermined' | 'denied' | 'blocked';

export type ScheduledContent = { title: string; body: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function nativePlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** Expo WEEKLY trigger weekday: 1 = Sunday … 7 = Saturday. */
export function expoWeekday(day: ReminderDay): number {
  return jsWeekday(day) + 1;
}

export async function configureReminderChannel(name: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(FOXIEM_REMINDER_CHANNEL, {
    name,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function mapPermission(settings: Notifications.NotificationPermissionsStatus): NotificationPermission {
  if (settings.granted) {
    return 'granted';
  }
  if (settings.status === Notifications.PermissionStatus.DENIED) {
    return settings.canAskAgain === false ? 'blocked' : 'denied';
  }
  return 'undetermined';
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!nativePlatform()) {
    return 'granted';
  }
  try {
    return mapPermission(await Notifications.getPermissionsAsync());
  } catch {
    return 'undetermined';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!nativePlatform()) {
    return 'granted';
  }
  const current = await getNotificationPermission();
  if (current === 'granted' || current === 'blocked') {
    return current;
  }
  try {
    return mapPermission(
      await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } }),
    );
  } catch {
    return 'undetermined';
  }
}

export async function cancelNotifications(ids: readonly string[]): Promise<void> {
  if (!nativePlatform() || ids.length === 0) {
    return;
  }
  await Promise.all(
    ids.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // Already fired or gone.
      }
    }),
  );
}

function data(reminderId: string, trackerId: string | null) {
  return { foxiem: 'reminder', reminderId, trackerId: trackerId ?? '' };
}

/** Repeating weekly notifications with fixed copy (standard reminders). */
export async function scheduleWeekly(
  reminder: { id: string; trackerId: string | null; time: string; days: readonly ReminderDay[] },
  content: ScheduledContent,
): Promise<string[]> {
  const time = parseTimeString(reminder.time);
  if (!nativePlatform() || !time) {
    return [];
  }
  const ids: string[] = [];
  try {
    for (const day of reminder.days) {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { ...content, sound: 'default', data: data(reminder.id, reminder.trackerId) },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: expoWeekday(day),
            hour: time.hour,
            minute: time.minute,
            channelId: Platform.OS === 'android' ? FOXIEM_REMINDER_CHANNEL : undefined,
          },
        }),
      );
    }
  } catch (error) {
    await cancelNotifications(ids);
    throw error;
  }
  return ids;
}

/** One-off notifications with copy computed per occurrence (smart reminders). */
export async function scheduleOccurrences(
  reminder: { id: string; trackerId: string | null },
  occurrences: readonly { date: Date; content: ScheduledContent }[],
): Promise<string[]> {
  if (!nativePlatform()) {
    return [];
  }
  const ids: string[] = [];
  try {
    for (const occurrence of occurrences) {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { ...occurrence.content, sound: 'default', data: data(reminder.id, reminder.trackerId) },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: occurrence.date,
            channelId: Platform.OS === 'android' ? FOXIEM_REMINDER_CHANNEL : undefined,
          },
        }),
      );
    }
  } catch (error) {
    await cancelNotifications(ids);
    throw error;
  }
  return ids;
}

export function reminderTarget(response: Notifications.NotificationResponse): { trackerId: string | null } | null {
  const payload = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (payload?.foxiem !== 'reminder') {
    return null;
  }
  return { trackerId: typeof payload.trackerId === 'string' && payload.trackerId ? payload.trackerId : null };
}
