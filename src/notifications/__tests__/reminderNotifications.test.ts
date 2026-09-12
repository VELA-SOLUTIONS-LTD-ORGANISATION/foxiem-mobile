import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  cancelReminderNotifications,
  expoWeekdayForReminderDay,
  scheduleReminderNotifications,
} from '@/notifications/reminderNotifications';
import { EVERY_DAY, WEEKDAY_DAYS, WEEKEND_DAYS, type Reminder } from '@/state/reminders';

function reminder(partial: Partial<Reminder> & Pick<Reminder, 'days'>): Reminder {
  return {
    id: 'reminder-1',
    enabled: true,
    time: '08:00',
    messageKey: 'notifications.messages.daily',
    notificationIds: [],
    createdAt: '2026-09-12T10:00:00.000Z',
    ...partial,
  };
}

describe('reminder weekday mapping', () => {
  it('maps Foxiem days to Expo 1=Sunday … 7=Saturday', () => {
    expect(expoWeekdayForReminderDay('sunday')).toBe(1);
    expect(expoWeekdayForReminderDay('monday')).toBe(2);
    expect(expoWeekdayForReminderDay('saturday')).toBe(7);
  });
});

describe('scheduleReminderNotifications', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
    jest.clearAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
  });

  it('schedules 7 weekly notifications for every day', async () => {
    const ids = await scheduleReminderNotifications(reminder({ days: [...EVERY_DAY] }));
    expect(ids).toHaveLength(7);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(7);
  });

  it('schedules weekdays and weekends only', async () => {
    await scheduleReminderNotifications(reminder({ days: [...WEEKDAY_DAYS] }));
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(5);

    jest.clearAllMocks();
    await scheduleReminderNotifications(reminder({ days: [...WEEKEND_DAYS] }));
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('cancels newly created ids when a later schedule throws', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock)
      .mockResolvedValueOnce('id-1')
      .mockResolvedValueOnce('id-2')
      .mockResolvedValueOnce('id-3')
      .mockResolvedValueOnce('id-4')
      .mockRejectedValueOnce(new Error('boom'));

    await expect(
      scheduleReminderNotifications(reminder({ days: [...EVERY_DAY] })),
    ).rejects.toThrow('boom');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('id-1');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('id-2');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('id-3');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('id-4');
  });

  it('returns [] when disabled', async () => {
    await expect(
      scheduleReminderNotifications(reminder({ enabled: false, days: [...EVERY_DAY] })),
    ).resolves.toEqual([]);
  });
});

describe('cancelReminderNotifications', () => {
  it('cancels each provided id on native platforms', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    await cancelReminderNotifications(['a', 'b']);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('a');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('b');
  });
});
