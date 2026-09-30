import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  COUNT_ACTION,
  QUICK_CATEGORY,
  configureQuickActions,
  quickCountTarget,
  scheduleOccurrences,
  scheduleWeekly,
} from '../reminderNotifications';

function response(actionIdentifier: string, data: Record<string, unknown>, identifier = 'n1', date = 1000) {
  return {
    actionIdentifier,
    notification: { date, request: { identifier, content: { data } } },
  } as unknown as Notifications.NotificationResponse;
}

describe('notification quick actions', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'ios';
    jest.clearAllMocks();
  });

  afterAll(() => {
    Platform.OS = originalOs;
  });

  it('registers one Count button that does not open the app', async () => {
    await configureQuickActions('Count');
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(QUICK_CATEGORY, [
      { identifier: COUNT_ACTION, buttonTitle: 'Count', options: { opensAppToForeground: false } },
    ]);
  });

  it('adds the button to tracker reminders only', async () => {
    await scheduleWeekly({ id: 'r1', trackerId: 't1', time: '20:00', days: ['monday'] }, { title: 'A', body: 'B' });
    await scheduleWeekly({ id: 'r2', trackerId: null, time: '20:00', days: ['monday'] }, { title: 'A', body: 'B' });
    await scheduleOccurrences({ id: 'r3', trackerId: 't1' }, [{ date: new Date(2030, 0, 1), content: { title: 'A', body: 'B' } }]);
    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls.map(([request]) => request.content.categoryIdentifier);
    expect(calls).toEqual([QUICK_CATEGORY, undefined, QUICK_CATEGORY]);
  });

  it('recognises a Count press with a stable key per press', () => {
    const press = quickCountTarget(response(COUNT_ACTION, { foxiem: 'reminder', trackerId: 't1' }, 'abc', 42));
    expect(press).toEqual({ trackerId: 't1', key: 'abc|42' });
    expect(quickCountTarget(response(COUNT_ACTION, { foxiem: 'reminder', trackerId: 't1' }, 'abc', 43))?.key).not.toBe(press?.key);
  });

  it('ignores plain taps, other apps and check-in reminders with no tracker', () => {
    expect(quickCountTarget(response('expo.modules.notifications.actions.DEFAULT', { foxiem: 'reminder', trackerId: 't1' }))).toBeNull();
    expect(quickCountTarget(response(COUNT_ACTION, { foxiem: 'other', trackerId: 't1' }))).toBeNull();
    expect(quickCountTarget(response(COUNT_ACTION, { foxiem: 'reminder', trackerId: '' }))).toBeNull();
  });
});
