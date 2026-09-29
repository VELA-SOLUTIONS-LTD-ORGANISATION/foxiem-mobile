/**
 * Readers for storage written by Foxiem 1.0.x.
 * v1: `foxiem.counter` = { currentCount } and `foxiem.history` = event[] (single counter).
 * v2: `foxiem.counterDomain` = { schemaVersion: 2, activeTopicId, topics[], events[] } (named topics).
 * These keys are never modified by the current app; they stay as a backup until Reset.
 */

export const LEGACY_DEFAULT_TOPIC_ID = 'topic.default';

export type LegacyEventType = 'increment' | 'decrement' | 'reset';

export type LegacyEvent = {
  id: string;
  topicId: string;
  type: LegacyEventType;
  amount: number;
  previousValue: number;
  newValue: number;
  createdAt: string;
};

export type LegacyTopic = {
  id: string;
  kind: 'default' | 'custom';
  name: string | null;
  currentCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type LegacyDomain = {
  version: 1 | 2;
  activeTopicId: string;
  topics: LegacyTopic[];
  events: LegacyEvent[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseLegacyEvent(value: unknown): LegacyEvent | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, type, amount, previousValue, newValue, createdAt, topicId } = value;
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    (type !== 'increment' && type !== 'decrement' && type !== 'reset') ||
    !finite(amount) ||
    !finite(previousValue) ||
    !finite(newValue) ||
    !isIsoDate(createdAt)
  ) {
    return null;
  }
  return {
    id,
    topicId: typeof topicId === 'string' && topicId.trim().length > 0 ? topicId : LEGACY_DEFAULT_TOPIC_ID,
    type,
    amount,
    previousValue,
    newValue,
    createdAt,
  };
}

/** Accepts `event[]` or `{ events: event[] }`; the pre-release `{ entries }` mock payload is ignored. */
export function parseLegacyEvents(value: unknown): LegacyEvent[] {
  const list = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.events)
      ? value.events
      : [];
  const seen = new Set<string>();
  const events: LegacyEvent[] = [];
  for (const item of list) {
    const event = parseLegacyEvent(item);
    if (event && !seen.has(event.id)) {
      seen.add(event.id);
      events.push(event);
    }
  }
  return events;
}

export function parseLegacyCount(value: unknown): number | null {
  if (!isRecord(value) || !finite(value.currentCount)) {
    return null;
  }
  return Math.max(0, Math.floor(value.currentCount));
}

function parseLegacyTopic(value: unknown): LegacyTopic | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null;
  }
  const isDefault = value.id === LEGACY_DEFAULT_TOPIC_ID || value.kind === 'default';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!isDefault && !name) {
    return null;
  }
  return {
    id: isDefault ? LEGACY_DEFAULT_TOPIC_ID : value.id,
    kind: isDefault ? 'default' : 'custom',
    name: isDefault ? null : name,
    currentCount: finite(value.currentCount) ? Math.max(0, Math.floor(value.currentCount)) : 0,
    createdAt: isIsoDate(value.createdAt) ? value.createdAt : new Date(0).toISOString(),
    updatedAt: isIsoDate(value.updatedAt) ? value.updatedAt : null,
  };
}

export function parseLegacyDomainV2(value: unknown): LegacyDomain | null {
  if (!isRecord(value) || !Array.isArray(value.topics)) {
    return null;
  }
  const topics: LegacyTopic[] = [];
  const ids = new Set<string>();
  for (const item of value.topics) {
    const topic = parseLegacyTopic(item);
    if (topic && !ids.has(topic.id)) {
      ids.add(topic.id);
      topics.push(topic);
    }
  }
  if (!ids.has(LEGACY_DEFAULT_TOPIC_ID)) {
    topics.unshift({
      id: LEGACY_DEFAULT_TOPIC_ID,
      kind: 'default',
      name: null,
      currentCount: 0,
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
    });
    ids.add(LEGACY_DEFAULT_TOPIC_ID);
  }
  const events = parseLegacyEvents(value.events).map((event) =>
    ids.has(event.topicId) ? event : { ...event, topicId: LEGACY_DEFAULT_TOPIC_ID },
  );
  return {
    version: 2,
    activeTopicId:
      typeof value.activeTopicId === 'string' && ids.has(value.activeTopicId)
        ? value.activeTopicId
        : LEGACY_DEFAULT_TOPIC_ID,
    topics,
    events,
  };
}

export function legacyDomainFromV1(counter: unknown, history: unknown): LegacyDomain | null {
  const count = parseLegacyCount(counter);
  const events = parseLegacyEvents(history).map((event) => ({ ...event, topicId: LEGACY_DEFAULT_TOPIC_ID }));
  if (count === null && events.length === 0) {
    return null;
  }
  const sorted = [...events].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const createdAt = sorted[0]?.createdAt ?? new Date(0).toISOString();
  return {
    version: 1,
    activeTopicId: LEGACY_DEFAULT_TOPIC_ID,
    topics: [
      {
        id: LEGACY_DEFAULT_TOPIC_ID,
        kind: 'default',
        name: null,
        currentCount: count ?? sorted[sorted.length - 1]?.newValue ?? 0,
        createdAt,
        updatedAt: null,
      },
    ],
    events,
  };
}

/** True when a legacy domain holds anything the user created or counted. */
export function legacyHasUserData(domain: LegacyDomain): boolean {
  return (
    domain.events.length > 0 ||
    domain.topics.some((topic) => topic.kind === 'custom' || topic.currentCount > 0)
  );
}
