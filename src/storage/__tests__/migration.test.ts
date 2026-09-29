import AsyncStorage from '@react-native-async-storage/async-storage';

import { chainIsConsistent, runningValue } from '@/domain/events';
import { resetFoxiemAppData, writeJson } from '@/storage/appStorage';
import {
  loadDomain,
  saveTrackerEvents,
  saveTrackers,
} from '@/storage/domainStorage';
import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS, eventsKey } from '@/storage/keys';
import { parseReminders } from '@/storage/reminderStorage';
import { parsePreferences } from '@/storage/preferencesStorage';

const legacyEvent = {
  id: 'abc',
  type: 'increment' as const,
  amount: 1,
  previousValue: 46,
  newValue: 47,
  createdAt: '2026-09-12T10:00:00.000Z',
};

const v2Domain = {
  schemaVersion: 2,
  activeTopicId: 'topic.water',
  topics: [
    { id: 'topic.default', kind: 'default', currentCount: 47, createdAt: '2026-09-01T00:00:00.000Z' },
    { id: 'topic.water', kind: 'custom', name: 'Water', currentCount: 6, createdAt: '2026-09-02T00:00:00.000Z' },
  ],
  events: [
    { ...legacyEvent, topicId: 'topic.default' },
    { id: 'w1', topicId: 'topic.water', type: 'increment', amount: 6, previousValue: 0, newValue: 6, createdAt: '2026-09-14T10:00:00.000Z' },
    { id: 'r1', topicId: 'topic.water', type: 'reset', amount: 0, previousValue: 6, newValue: 0, createdAt: '2026-09-15T10:00:00.000Z' },
    { id: 'w2', topicId: 'topic.water', type: 'increment', amount: 6, previousValue: 0, newValue: 6, createdAt: '2026-09-16T10:00:00.000Z' },
  ],
};

const options = { defaultTrackerName: 'General' };

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('existing Foxiem users keep everything', () => {
  it('v2 topics become Just count trackers with every event and visible count preserved', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    await writeJson(STORAGE_KEYS.legacyTopicMigrationVersion, 1);
    await writeJson(STORAGE_KEYS.legacySetupCompleted, true);

    const loaded = await loadDomain(options);
    expect(loaded.source).toBe('migratedV2');
    expect(loaded.firstRunCompleted).toBe(true);
    expect(loaded.trackers.map((tracker) => [tracker.id, tracker.name, tracker.intent, tracker.period])).toEqual([
      ['topic.water', 'Water', 'count', 'all'],
      ['topic.default', 'General', 'count', 'all'],
    ]);
    const general = loaded.trackers.find((tracker) => tracker.id === 'topic.default')!;
    const water = loaded.trackers.find((tracker) => tracker.id === 'topic.water')!;
    expect(runningValue(general, loaded.events[general.id]!)).toBe(47);
    expect(general.startingValue).toBe(46);
    expect(runningValue(water, loaded.events[water.id]!)).toBe(6);
    expect(loaded.events[water.id]!.map((event) => event.id)).toEqual(['w1', 'r1', 'w2']);
    expect(chainIsConsistent(water, loaded.events[water.id]!)).toBe(true);

    // Legacy data is untouched as a backup.
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.legacyCounterDomain))!)).toEqual(v2Domain);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.schemaVersion)).toBe(String(CURRENT_SCHEMA_VERSION));
  });

  it('v1 single counter migrates, including a count with no history', async () => {
    await writeJson(STORAGE_KEYS.legacyCounter, { currentCount: 247 });
    const loaded = await loadDomain(options);
    expect(loaded.source).toBe('migratedV1');
    expect(loaded.trackers).toHaveLength(1);
    expect(runningValue(loaded.trackers[0]!, loaded.events[loaded.trackers[0]!.id]!)).toBe(247);
    expect(loaded.events[loaded.trackers[0]!.id]).toEqual([]);
  });

  it('keeps the number the user saw when 1.0.0 history and count disagree', async () => {
    await writeJson(STORAGE_KEYS.legacyCounter, { currentCount: 50 });
    await writeJson(STORAGE_KEYS.legacyHistory, [legacyEvent]);
    const loaded = await loadDomain(options);
    const tracker = loaded.trackers[0]!;
    const events = loaded.events[tracker.id]!;
    expect(runningValue(tracker, events)).toBe(50);
    expect(events[events.length - 1]).toMatchObject({ type: 'adjust', source: 'migration', newValue: 50 });
    expect(chainIsConsistent(tracker, events)).toBe(true);
  });

  it('is idempotent and survives being interrupted before the version marker', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    const first = await loadDomain(options);
    // Simulate a crash after shards + index were written but before the marker.
    await AsyncStorage.removeItem(STORAGE_KEYS.schemaVersion);
    const second = await loadDomain(options);
    expect(second.trackers).toEqual(first.trackers);
    expect(second.events).toEqual(first.events);
    const third = await loadDomain(options);
    expect(third.source).toBe('current');
    expect(third.trackers).toEqual(first.trackers);
  });

  it('does not create an empty tracker for an untouched 1.0.x install', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, {
      schemaVersion: 2,
      activeTopicId: 'topic.default',
      topics: [{ id: 'topic.default', kind: 'default', currentCount: 0, createdAt: '2026-09-01T00:00:00.000Z' }],
      events: [],
    });
    const loaded = await loadDomain(options);
    expect(loaded.source).toBe('fresh');
    expect(loaded.trackers).toEqual([]);
    expect(loaded.firstRunCompleted).toBe(false);
  });

  it('1.0.x reminders stay general check-ins and preferences keep the language', () => {
    const reminders = parseReminders([
      {
        id: 'r1',
        enabled: true,
        time: '08:00',
        days: ['monday', 'friday'],
        messageKey: 'notifications.messages.momentum',
        notificationIds: ['n1', 'n2'],
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ]);
    expect(reminders[0]).toMatchObject({
      trackerId: null,
      smart: false,
      messageKey: 'notifications.messages.momentum',
      notificationIds: ['n1', 'n2'],
    });
    expect(parsePreferences({ language: 'tr' })).toMatchObject({ language: 'tr', appearance: 'system', haptics: true });
  });
});

describe('current storage', () => {
  it('fresh install starts empty and needs first run', async () => {
    const loaded = await loadDomain(options);
    expect(loaded).toMatchObject({ source: 'fresh', trackers: [], firstRunCompleted: false });
  });

  it('a corrupt tracker index is quarantined and recovered from the 1.0.x backup', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    await loadDomain(options);
    await AsyncStorage.setItem(STORAGE_KEYS.trackers, '{not json');
    const recovered = await loadDomain(options);
    expect(recovered.source).toBe('recovered');
    expect(recovered.trackers).toHaveLength(2);
    const quarantine = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.recovery))!);
    expect(quarantine[0]).toMatchObject({ reason: 'trackers', raw: '{not json' });
  });

  it('one corrupt history shard only affects that tracker and is kept for recovery', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    await loadDomain(options);
    await AsyncStorage.setItem(eventsKey('topic.water'), '[broken');
    const loaded = await loadDomain(options);
    expect(loaded.unreadableTrackerIds).toEqual(['topic.water']);
    expect(loaded.events['topic.default']).toHaveLength(1);
    expect(await AsyncStorage.getItem(eventsKey('topic.water'))).toBe('[broken');
  });

  it('removes orphaned shards only when the tracker index is readable', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    const loaded = await loadDomain(options);
    await saveTrackers(loaded.trackers.filter((tracker) => tracker.id !== 'topic.water'));
    await loadDomain(options);
    expect(await AsyncStorage.getItem(eventsKey('topic.water'))).toBeNull();
  });

  it('Reset removes every Foxiem key and nothing else', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    await loadDomain(options);
    await saveTrackerEvents('topic.default', []);
    await AsyncStorage.setItem('other.library.key', 'keep');
    await resetFoxiemAppData();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toEqual(['other.library.key']);
    const fresh = await loadDomain(options);
    expect(fresh).toMatchObject({ source: 'fresh', trackers: [] });
  });
});
