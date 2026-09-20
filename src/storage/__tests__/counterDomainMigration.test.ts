import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_TOPIC_ID, TOPIC_MIGRATION_VERSION } from '@/state/topics';
import {
  createFreshCounterDomain,
  loadOrMigrateCounterDomain,
  migrateLegacyToDomain,
  parseCounterDomain,
  saveCounterDomain,
} from '@/storage/counterDomainStorage';
import { STORAGE_KEYS } from '@/storage/keys';
import { resetFoxiemAppData, writeJson } from '@/storage/appStorage';

const legacyEvent = {
  id: 'abc',
  type: 'increment' as const,
  amount: 1,
  previousValue: 46,
  newValue: 47,
  createdAt: '2026-09-12T10:00:00.000Z',
};

describe('counter domain migration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('TEST 1 — migrates a legacy count and preserves event fields', async () => {
    await writeJson(STORAGE_KEYS.counter, { currentCount: 47 });
    await writeJson(STORAGE_KEYS.history, [legacyEvent]);

    const domain = await loadOrMigrateCounterDomain();
    expect(domain.activeTopicId).toBe(DEFAULT_TOPIC_ID);
    expect(domain.topics).toHaveLength(1);
    expect(domain.topics[0]).toMatchObject({ id: DEFAULT_TOPIC_ID, currentCount: 47 });
    expect(domain.events).toHaveLength(1);
    expect(domain.events[0]).toEqual({
      ...legacyEvent,
      topicId: DEFAULT_TOPIC_ID,
    });
    await expect(AsyncStorage.getItem(STORAGE_KEYS.topicMigrationVersion)).resolves.toBe(
      String(TOPIC_MIGRATION_VERSION),
    );
  });

  it('TEST 2 — preserves legacy count with empty history', () => {
    const domain = migrateLegacyToDomain(247, []);
    expect(domain.topics[0]?.currentCount).toBe(247);
    expect(domain.events).toEqual([]);
  });

  it('TEST 3 — migration is idempotent', async () => {
    await writeJson(STORAGE_KEYS.counter, { currentCount: 47 });
    await writeJson(STORAGE_KEYS.history, [legacyEvent]);

    const first = await loadOrMigrateCounterDomain();
    const second = await loadOrMigrateCounterDomain();

    expect(second.topics).toHaveLength(1);
    expect(second.events).toHaveLength(1);
    expect(second.events[0]?.id).toBe(first.events[0]?.id);
    expect(second.topics[0]?.currentCount).toBe(47);
  });

  it('TEST 4 — recovers a valid domain written before the migration flag', async () => {
    const partial = migrateLegacyToDomain(47, [
      { ...legacyEvent, topicId: DEFAULT_TOPIC_ID },
    ]);
    await saveCounterDomain(partial);
    await writeJson(STORAGE_KEYS.counter, { currentCount: 47 });
    await writeJson(STORAGE_KEYS.history, [legacyEvent]);

    const domain = await loadOrMigrateCounterDomain();
    expect(domain.topics).toHaveLength(1);
    expect(domain.events).toHaveLength(1);
    expect(domain.events[0]?.id).toBe('abc');
  });

  it('initializes a fresh install without fabricating legacy history', async () => {
    const domain = await loadOrMigrateCounterDomain();
    expect(domain).toMatchObject(createFreshCounterDomain(domain.topics[0]?.createdAt));
    expect(domain.topics[0]?.currentCount).toBe(0);
    expect(domain.events).toEqual([]);
  });

  it('preserves multi-topic state across persist and reload', async () => {
    const created = migrateLegacyToDomain(47, [{ ...legacyEvent, topicId: DEFAULT_TOPIC_ID }]);
    const water = {
      id: 'topic.water',
      kind: 'custom' as const,
      name: 'Water',
      currentCount: 6,
      createdAt: '2026-09-02T00:00:00.000Z',
    };
    const domain = {
      ...created,
      activeTopicId: 'topic.water',
      topics: [...created.topics, water],
      events: [
        ...created.events,
        {
          id: 'water-1',
          topicId: 'topic.water',
          type: 'increment' as const,
          amount: 6,
          previousValue: 0,
          newValue: 6,
          createdAt: '2026-09-14T10:00:00.000Z',
        },
      ],
    };

    await saveCounterDomain(domain);
    await writeJson(STORAGE_KEYS.topicMigrationVersion, TOPIC_MIGRATION_VERSION);

    const reloaded = await loadOrMigrateCounterDomain();
    expect(reloaded.activeTopicId).toBe('topic.water');
    expect(reloaded.topics.map((topic) => ({ id: topic.id, currentCount: topic.currentCount, name: topic.name }))).toEqual([
      { id: DEFAULT_TOPIC_ID, currentCount: 47, name: undefined },
      { id: 'topic.water', currentCount: 6, name: 'Water' },
    ]);
    expect(reloaded.events.map((event) => event.id)).toEqual(['abc', 'water-1']);
  });

  it('resetFoxiemAppData then hydrate yields a fresh default topic', async () => {
    await writeJson(STORAGE_KEYS.counterDomain, {
      schemaVersion: 2,
      activeTopicId: 'topic.water',
      topics: [
        { id: DEFAULT_TOPIC_ID, kind: 'default', currentCount: 47, createdAt: '2026-09-01T00:00:00.000Z' },
        { id: 'topic.water', kind: 'custom', name: 'Water', currentCount: 6, createdAt: '2026-09-02T00:00:00.000Z' },
      ],
      events: [{ ...legacyEvent, topicId: DEFAULT_TOPIC_ID }],
    });
    await writeJson(STORAGE_KEYS.topicMigrationVersion, TOPIC_MIGRATION_VERSION);
    await writeJson(STORAGE_KEYS.profile, { name: 'Hakan', username: 'hakan' });

    await resetFoxiemAppData();
    const domain = await loadOrMigrateCounterDomain();

    expect(domain.topics).toHaveLength(1);
    expect(domain.topics[0]).toMatchObject({ id: DEFAULT_TOPIC_ID, currentCount: 0 });
    expect(domain.events).toEqual([]);
    expect(domain.activeTopicId).toBe(DEFAULT_TOPIC_ID);
  });

  it('falls back to topic.default when activeTopicId is corrupt', () => {
    const parsed = parseCounterDomain({
      schemaVersion: 2,
      activeTopicId: 'missing-topic',
      topics: [{ id: DEFAULT_TOPIC_ID, kind: 'default', currentCount: 3, createdAt: '2026-09-12T10:00:00.000Z' }],
      events: [],
    });
    expect(parsed?.activeTopicId).toBe(DEFAULT_TOPIC_ID);
  });
});
