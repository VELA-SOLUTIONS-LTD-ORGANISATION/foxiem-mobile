import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { i18n } from '@/i18n';
import {
  parseTimeString,
  type Reminder,
  type ReminderDay,
} from '@/state/reminders';

export const FOXIEM_REMINDER_CHANNEL = 'foxiem-reminders';

const EXPO_WEEKDAY: Record<ReminderDay, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

/** Expo WEEKLY trigger weekday mapping used by Foxiem reminders. */
export function expoWeekdayForReminderDay(day: ReminderDay): number {
  return EXPO_WEEKDAY[day];
}

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function canUseNativeNotifications(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function configureReminderNotifications(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(FOXIEM_REMINDER_CHANNEL, {
    name: i18n.t('reminders.title'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (!canUseNativeNotifications()) {
    return 'granted';
  }

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) {
    return 'granted';
  }

  if (settings.status === Notifications.PermissionStatus.DENIED) {
    return 'denied';
  }

  return 'undetermined';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!canUseNativeNotifications()) {
    return 'granted';
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return 'granted';
  }

  if (current.status === Notifications.PermissionStatus.DENIED && current.canAskAgain === false) {
    return 'denied';
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  if (requested.granted) {
    return 'granted';
  }

  if (requested.status === Notifications.PermissionStatus.DENIED) {
    return 'denied';
  }

  return 'undetermined';
}

export async function cancelReminderNotifications(notificationIds: readonly string[]): Promise<void> {
  if (!canUseNativeNotifications() || notificationIds.length === 0) {
    return;
  }

  await Promise.all(
    notificationIds.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (error) {
        console.warn('Failed to cancel Foxiem reminder notification', id, error);
      }
    }),
  );
}

export async function cancelReminders(reminders: readonly Reminder[]): Promise<void> {
  const ids = reminders.flatMap((reminder) => reminder.notificationIds);
  await cancelReminderNotifications(ids);
}

export async function scheduleReminderNotifications(reminder: Reminder): Promise<string[]> {
  if (!canUseNativeNotifications() || !reminder.enabled) {
    return [];
  }

  const parsedTime = parseTimeString(reminder.time);
  if (!parsedTime || reminder.days.length === 0) {
    return [];
  }

  await configureReminderNotifications();
  await cancelReminderNotifications(reminder.notificationIds);

  const title = i18n.t('about.appName');
  const body = i18n.t(reminder.messageKey);
  const ids: string[] = [];

  try {
    for (const day of reminder.days) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            foxiem: 'reminder',
            reminderId: reminder.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekdayForReminderDay(day),
          hour: parsedTime.hour,
          minute: parsedTime.minute,
          channelId: Platform.OS === 'android' ? FOXIEM_REMINDER_CHANNEL : undefined,
        },
      });
      ids.push(id);
    }
  } catch (error) {
    await cancelReminderNotifications(ids);
    if (__DEV__) {
      console.warn('Failed to schedule Foxiem reminder notifications', error);
    }
    throw error;
  }

  return ids;
}

export function isFoxiemReminderResponse(response: Notifications.NotificationResponse): boolean {
  const data = response.notification.request.content.data;
  return data?.foxiem === 'reminder';
}
