import AsyncStorage from '@react-native-async-storage/async-storage';

import { readJson, resetFoxiemAppData, writeJson } from '@/storage/appStorage';
import { parseCounterEvents, parseCounterState } from '@/storage/counterStorage';
import { FOXIEM_STORAGE_KEYS, STORAGE_KEYS } from '@/storage/keys';
import { parseReminders } from '@/storage/reminderStorage';

describe('counter storage parsers', () => {
  it('parses valid counter and floors negative to 0', () => {
    expect(parseCounterState({ currentCount: 12.9 })).toEqual({ currentCount: 12 });
    expect(parseCounterState({ currentCount: -3 })).toEqual({ currentCount: 0 });
    expect(parseCounterState(null)).toEqual({ currentCount: 0 });
  });

  it('ignores legacy { entries } history without converting', () => {
    expect(parseCounterEvents({ entries: [{ id: 'x' }] })).toEqual([]);
  });

  it('loads valid events oldest→newest and drops malformed items', () => {
    const events = parseCounterEvents([
      {
        id: 'b',
        type: 'increment',
        amount: 1,
        previousValue: 1,
        newValue: 2,
        createdAt: '2026-09-12T11:00:00.000Z',
      },
      { id: 'bad' },
      {
        id: 'a',
        type: 'increment',
        amount: 1,
        previousValue: 0,
        newValue: 1,
        createdAt: '2026-09-12T10:00:00.000Z',
      },
    ]);
    expect(events.map((event) => event.id)).toEqual(['a', 'b']);
    expect(events.every((event) => event.topicId === 'topic.default')).toBe(true);
  });
});

describe('reminder storage parsers', () => {
  it('hydrates legacy { enabled } payload to []', () => {
    expect(parseReminders({ enabled: true })).toEqual([]);
  });

  it('round-trips valid reminders and migrates notificationId', () => {
    const parsed = parseReminders([
      {
        id: 'r1',
        enabled: true,
        time: '08:00',
        days: ['monday', 'tuesday'],
        messageKey: 'notifications.messages.daily',
        notificationId: 'legacy-id',
        createdAt: '2026-09-12T10:00:00.000Z',
      },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.notificationIds).toEqual(['legacy-id']);
  });
});

describe('appStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('write/read json round trip', async () => {
    await writeJson(STORAGE_KEYS.profile, { name: 'Hakan', username: 'hakan' });
    await expect(readJson(STORAGE_KEYS.profile)).resolves.toEqual({
      name: 'Hakan',
      username: 'hakan',
    });
  });

  it('malformed json removes key and returns null without crash', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.counter, '{not-json');
    await expect(readJson(STORAGE_KEYS.counter)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(STORAGE_KEYS.counter)).resolves.toBeNull();
  });

  it('resetFoxiemAppData removes only Foxiem keys via multiRemove', async () => {
    await AsyncStorage.setItem('unrelated.user', 'keep-me');
    for (const key of FOXIEM_STORAGE_KEYS) {
      await AsyncStorage.setItem(key, '"x"');
    }

    const multiRemove = jest.spyOn(AsyncStorage, 'multiRemove');
    multiRemove.mockClear();

    await resetFoxiemAppData();

    expect(multiRemove).toHaveBeenCalledWith([...FOXIEM_STORAGE_KEYS]);
    await expect(AsyncStorage.getItem('unrelated.user')).resolves.toBe('keep-me');
    for (const key of FOXIEM_STORAGE_KEYS) {
      await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
    }
  });
});
