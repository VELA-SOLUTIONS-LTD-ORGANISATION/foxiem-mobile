import AsyncStorage from '@react-native-async-storage/async-storage';

import { makeEvents, makeTracker, at } from '@/domain/__tests__/helpers';
import { chainIsConsistent, rebuildChain, runningValue } from '@/domain/events';
import { resetFoxiemAppData, writeJson } from '@/storage/appStorage';
import {
  loadDomain,
  saveTrackerEvents,
  saveTrackers,
} from '@/storage/domainStorage';
import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS, eventsKey } from '@/storage/keys';
import { mergeDomains, migrateLegacyDomain } from '@/storage/migration';
import { readMigrationRecord } from '@/storage/migrationState';
import { parseLegacyDomainV2 } from '@/storage/legacy';
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

describe('an interrupted migration never overwrites what the user did afterwards', () => {
  const newTracker = () => makeTracker({ name: 'Coffee', intent: 'limit', target: 3, period: 'day' });
  const newEvents = (tracker: ReturnType<typeof newTracker>) => makeEvents(tracker, [[at(2026, 9, 20, 9), 1], [at(2026, 9, 20, 11), 1]]);

  const original = { setItem: AsyncStorage.setItem, multiSet: AsyncStorage.multiSet };

  /** Make matching writes throw until estoreStorage runs. */
  function failWrites(match: (key: string) => boolean, options: { times?: number } = {}) {
    let remaining = options.times ?? Number.POSITIVE_INFINITY;
    const guard = (keys: string[]) => {
      if (remaining > 0 && keys.some(match)) {
        remaining -= 1;
        throw new Error('storage write failed');
      }
    };
    AsyncStorage.setItem = (async (key: string, value: string) => {
      guard([key]);
      return original.setItem(key, value);
    }) as typeof AsyncStorage.setItem;
    AsyncStorage.multiSet = (async (pairs: [string, string][]) => {
      guard(pairs.map(([key]) => key));
      return original.multiSet(pairs);
    }) as typeof AsyncStorage.multiSet;
  }

  function restoreStorage() {
    AsyncStorage.setItem = original.setItem;
    AsyncStorage.multiSet = original.multiSet;
  }

  afterEach(restoreStorage);

  it('records started ? staged ? committed and keeps the legacy backup', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    const loaded = await loadDomain(options);
    expect(loaded).toMatchObject({ persisted: true, migration: 'committed' });
    const record = await readMigrationRecord();
    expect(record).toMatchObject({ state: 'committed', source: 'v2', attempts: 1 });
    expect(record?.stagedAt).not.toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.legacyCounterDomain))!)).toEqual(v2Domain);
  });

  it('shows migrated counters from memory when storage refuses every write, and retries later', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    failWrites(() => true);

    const failed = await loadDomain(options);
    expect(failed).toMatchObject({ persisted: false, migration: 'started', source: 'migratedV2' });
    expect(failed.trackers).toHaveLength(2);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.schemaVersion)).toBeNull();

    restoreStorage();
    const retried = await loadDomain(options);
    expect(retried).toMatchObject({ persisted: true, migration: 'committed' });
    expect(retried.trackers.map((tracker) => tracker.id)).toEqual(['topic.water', 'topic.default']);
    expect((await readMigrationRecord())?.attempts).toBe(1);
  });

  it('keeps trackers created in a failed session (nothing was loaded, index saved without a version marker)', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    const coffee = newTracker();
    // The failed session had an empty in-memory state, so it only wrote what the user made.
    await saveTrackerEvents(coffee.id, newEvents(coffee));
    await saveTrackers([coffee]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.schemaVersion)).toBeNull();

    const loaded = await loadDomain(options);
    expect(loaded.trackers.map((tracker) => tracker.id)).toEqual(['topic.water', 'topic.default', coffee.id]);
    expect(loaded.events[coffee.id]).toHaveLength(2);
    expect(runningValue(coffee, loaded.events[coffee.id]!)).toBe(2);
    const water = loaded.trackers.find((tracker) => tracker.id === 'topic.water')!;
    expect(runningValue(water, loaded.events[water.id]!)).toBe(6);

    const again = await loadDomain(options);
    expect(again.source).toBe('current');
    expect(again.trackers.map((tracker) => tracker.id)).toEqual(['topic.water', 'topic.default', coffee.id]);
  });

  it('keeps new activity on a migrated counter whose index write never happened', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    const first = await loadDomain(options);
    await AsyncStorage.removeItem(STORAGE_KEYS.schemaVersion);
    await AsyncStorage.removeItem(STORAGE_KEYS.trackers);
    await AsyncStorage.removeItem(STORAGE_KEYS.migration);
    const water = first.trackers.find((tracker) => tracker.id === 'topic.water')!;
    const events = [
      ...first.events[water.id]!,
      {
        id: 'after-migration',
        trackerId: water.id,
        type: 'increment' as const,
        amount: 2,
        previousValue: 6,
        newValue: 8,
        createdAt: '2026-09-25T10:00:00.000Z',
      },
    ];
    await saveTrackerEvents(water.id, events);

    const loaded = await loadDomain(options);
    expect(runningValue(water, loaded.events[water.id]!)).toBe(8);
    expect(loaded.events[water.id]!.map((event) => event.id)).toContain('after-migration');
    expect(chainIsConsistent(water, loaded.events[water.id]!)).toBe(true);
  });

  it('a fresh install that failed to write its first state does not lose trackers made in that session', async () => {
    const coffee = newTracker();
    await saveTrackerEvents(coffee.id, newEvents(coffee));
    await saveTrackers([coffee]);
    const loaded = await loadDomain(options);
    expect(loaded.trackers.map((tracker) => tracker.id)).toEqual([coffee.id]);
    expect(loaded.events[coffee.id]).toHaveLength(2);
    expect(loaded.firstRunCompleted).toBe(true);
  });

  it('commits a fully staged result without transforming again when only the version marker failed', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    failWrites((key) => key === STORAGE_KEYS.schemaVersion);
    const first = await loadDomain(options);
    expect(first.persisted).toBe(true);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.schemaVersion)).toBeNull();
    expect((await readMigrationRecord())?.state).toBe('staged');
    restoreStorage();

    // The user keeps counting in that session; the app writes straight to the live keys.
    const water = first.trackers.find((tracker) => tracker.id === 'topic.water')!;
    await saveTrackerEvents(
      water.id,
      rebuildChain(water.startingValue, [
        ...first.events[water.id]!,
        { id: 'later', trackerId: water.id, type: 'increment', amount: 1, previousValue: 6, newValue: 7, createdAt: '2026-09-26T10:00:00.000Z' },
      ]),
    );

    const second = await loadDomain(options);
    expect(runningValue(water, second.events[water.id]!)).toBe(7);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.schemaVersion)).toBe(String(CURRENT_SCHEMA_VERSION));
    expect((await readMigrationRecord())?.state).toBe('committed');
    expect((await readMigrationRecord())?.attempts).toBe(1);
  });

  it('a rebuilt index keeps history written after the migration and never deletes orphaned history', async () => {
    await writeJson(STORAGE_KEYS.legacyCounterDomain, v2Domain);
    const first = await loadDomain(options);
    const water = first.trackers.find((tracker) => tracker.id === 'topic.water')!;
    await saveTrackerEvents(
      water.id,
      rebuildChain(water.startingValue, [
        ...first.events[water.id]!,
        { id: 'post', trackerId: water.id, type: 'increment', amount: 3, previousValue: 6, newValue: 9, createdAt: '2026-09-27T10:00:00.000Z' },
      ]),
    );
    const coffee = newTracker();
    await saveTrackerEvents(coffee.id, newEvents(coffee));
    await AsyncStorage.setItem(STORAGE_KEYS.trackers, '{not json');

    const recovered = await loadDomain(options);
    expect(recovered.source).toBe('recovered');
    expect(runningValue(water, recovered.events[water.id]!)).toBe(9);
    // The coffee tracker's name is lost with the index, but its history is not deleted.
    await loadDomain(options);
    expect(JSON.parse((await AsyncStorage.getItem(eventsKey(coffee.id)))!)).toHaveLength(2);
    expect((await readMigrationRecord())?.recoveredAt).not.toBeNull();
  });

  it('merges by id: live edits win, events are unioned, nothing is duplicated', () => {
    const base = migrateLegacyDomain(parseLegacyDomainV2(v2Domain)!, options);
    const live = {
      trackers: base.trackers.map((tracker) => (tracker.id === 'topic.water' ? { ...tracker, name: 'Hydration' } : tracker)),
      events: { 'topic.water': base.events['topic.water']! },
    };
    const merged = mergeDomains(base, live);
    expect(merged.trackers.find((tracker) => tracker.id === 'topic.water')?.name).toBe('Hydration');
    expect(merged.trackers).toHaveLength(2);
    expect(merged.events['topic.water']).toHaveLength(base.events['topic.water']!.length);
    expect(merged.trackers.map((tracker) => tracker.sortIndex)).toEqual([0, 1]);
  });
});
