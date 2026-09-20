import {
  COUNTER_SCHEMA_VERSION,
  createDefaultTopic,
  DEFAULT_TOPIC_ID,
  orderTopics,
  resolveActiveTopicId,
  TOPIC_MIGRATION_VERSION,
} from '@/state/topics';
import type { CounterDomainSnapshot, CounterEvent, CounterTopic } from '@/state/types';
import { DEFAULT_COUNTER, DEFAULT_COUNTER_EVENTS } from '@/state/types';

import { readJson, removeKey, writeJson } from './appStorage';
import { loadCounterEvents, loadCounterState, parseCounterEvents } from './counterStorage';
import { STORAGE_KEYS } from './keys';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseTopic(value: unknown): CounterTopic | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null;
  }

  const kind = value.kind === 'custom' ? 'custom' : value.id === DEFAULT_TOPIC_ID ? 'default' : null;
  if (!kind) {
    if (value.id === DEFAULT_TOPIC_ID) {
      return createDefaultTopic(
        typeof value.currentCount === 'number' ? value.currentCount : 0,
        typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
          ? value.createdAt
          : new Date().toISOString(),
      );
    }
    return null;
  }

  const createdAt =
    typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
      ? value.createdAt
      : new Date().toISOString();
  const currentCount =
    typeof value.currentCount === 'number' && Number.isFinite(value.currentCount)
      ? Math.max(0, Math.floor(value.currentCount))
      : 0;

  if (kind === 'default') {
    return {
      id: DEFAULT_TOPIC_ID,
      kind: 'default',
      currentCount,
      createdAt,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
    };
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) {
    return null;
  }

  return {
    id: value.id,
    kind: 'custom',
    name,
    currentCount,
    createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
  };
}

function sortEvents(events: readonly CounterEvent[]): CounterEvent[] {
  return [...events].sort((left, right) => {
    const timeDelta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return left.id.localeCompare(right.id);
  });
}

export function createFreshCounterDomain(
  createdAt: string = new Date().toISOString(),
): CounterDomainSnapshot {
  return {
    schemaVersion: COUNTER_SCHEMA_VERSION,
    activeTopicId: DEFAULT_TOPIC_ID,
    topics: [createDefaultTopic(0, createdAt)],
    events: [],
  };
}

export function migrateLegacyToDomain(
  currentCount: number,
  events: readonly CounterEvent[],
): CounterDomainSnapshot {
  const createdAt = events[0]?.createdAt ?? new Date().toISOString();
  const migratedEvents = events.map((event) => ({
    ...event,
    topicId: DEFAULT_TOPIC_ID,
  }));

  return {
    schemaVersion: COUNTER_SCHEMA_VERSION,
    activeTopicId: DEFAULT_TOPIC_ID,
    topics: [createDefaultTopic(currentCount, createdAt)],
    events: sortEvents(migratedEvents),
  };
}

export function parseCounterDomain(value: unknown): CounterDomainSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const topics = Array.isArray(value.topics)
    ? value.topics.flatMap((item) => {
        const topic = parseTopic(item);
        return topic ? [topic] : [];
      })
    : [];

  if (!topics.some((topic) => topic.id === DEFAULT_TOPIC_ID)) {
    topics.unshift(createDefaultTopic());
  }

  const events = sortEvents(parseCounterEvents(value.events));
  const knownIds = new Set(topics.map((topic) => topic.id));
  const safeEvents = events.map((event) =>
    knownIds.has(event.topicId) ? event : { ...event, topicId: DEFAULT_TOPIC_ID },
  );

  return {
    schemaVersion: COUNTER_SCHEMA_VERSION,
    activeTopicId: resolveActiveTopicId(topics, typeof value.activeTopicId === 'string' ? value.activeTopicId : null),
    topics: orderTopics(topics),
    events: safeEvents,
  };
}

export function isCompleteCounterDomain(domain: CounterDomainSnapshot): boolean {
  return (
    domain.schemaVersion === COUNTER_SCHEMA_VERSION &&
    domain.topics.some((topic) => topic.id === DEFAULT_TOPIC_ID) &&
    domain.events.every((event) => typeof event.topicId === 'string' && event.topicId.length > 0)
  );
}

export async function saveCounterDomain(domain: CounterDomainSnapshot): Promise<void> {
  await writeJson(STORAGE_KEYS.counterDomain, {
    schemaVersion: COUNTER_SCHEMA_VERSION,
    activeTopicId: resolveActiveTopicId(domain.topics, domain.activeTopicId),
    topics: orderTopics(domain.topics),
    events: sortEvents(domain.events),
  });
}

async function hasLegacyCounterKeys(): Promise<boolean> {
  const [counter, history] = await Promise.all([
    readJson<unknown>(STORAGE_KEYS.counter),
    readJson<unknown>(STORAGE_KEYS.history),
  ]);
  return counter != null || history != null;
}

async function cleanupLegacyCounterKeys(): Promise<void> {
  await Promise.all([removeKey(STORAGE_KEYS.counter), removeKey(STORAGE_KEYS.history)]);
}

export async function markTopicMigrationComplete(): Promise<void> {
  await writeJson(STORAGE_KEYS.topicMigrationVersion, TOPIC_MIGRATION_VERSION);
}

export async function loadOrMigrateCounterDomain(): Promise<CounterDomainSnapshot> {
  const [storedVersion, storedDomain] = await Promise.all([
    readJson<unknown>(STORAGE_KEYS.topicMigrationVersion),
    readJson<unknown>(STORAGE_KEYS.counterDomain),
  ]);

  const parsed = parseCounterDomain(storedDomain);
  const migrated = storedVersion === TOPIC_MIGRATION_VERSION;

  if (migrated && parsed && isCompleteCounterDomain(parsed)) {
    await cleanupLegacyCounterKeys();
    return parsed;
  }

  if (parsed && isCompleteCounterDomain(parsed)) {
    await markTopicMigrationComplete();
    await cleanupLegacyCounterKeys();
    return parsed;
  }

  const hasLegacy = await hasLegacyCounterKeys();
  if (!hasLegacy) {
    const fresh = parsed ?? createFreshCounterDomain();
    await saveCounterDomain(fresh);
    await markTopicMigrationComplete();
    return fresh;
  }

  const [legacyCounter, legacyEvents] = await Promise.all([loadCounterState(), loadCounterEvents()]);
  const domain = migrateLegacyToDomain(legacyCounter.currentCount, legacyEvents);
  await saveCounterDomain(domain);
  await markTopicMigrationComplete();
  await cleanupLegacyCounterKeys();
  return domain;
}

export function toActiveCounterState(domain: CounterDomainSnapshot) {
  const topic = domain.topics.find((item) => item.id === domain.activeTopicId);
  return { currentCount: topic?.currentCount ?? DEFAULT_COUNTER.currentCount };
}

export function toActiveEvents(domain: CounterDomainSnapshot): CounterEvent[] {
  return domain.events.filter((event) => event.topicId === domain.activeTopicId);
}

export const EMPTY_COUNTER_DOMAIN_EVENTS = DEFAULT_COUNTER_EVENTS;
