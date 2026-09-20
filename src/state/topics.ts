import { createLocalId } from '@/utils/id';

import type { CounterEvent, CounterTopic } from './types';

export const DEFAULT_TOPIC_ID = 'topic.default';
export const MAX_TOPIC_NAME_LENGTH = 40;
export const MAX_TOPIC_COUNT = 20;
export const COUNTER_SCHEMA_VERSION = 2;
export const TOPIC_MIGRATION_VERSION = 1;

export const RESERVED_DEFAULT_TOPIC_NAMES = [
  'general',
  'genel',
  'allgemein',
  'général',
  'generale',
] as const;

export type TopicNameError = 'required' | 'tooLong' | 'duplicate' | 'reserved' | 'limit';

export type TopicNameTranslator = (key: 'topics.defaultName') => string;

export function normalizeTopicName(value: string): string {
  return value.trim().normalize('NFC');
}

export function topicNameKey(value: string): string {
  return normalizeTopicName(value).toLocaleLowerCase();
}

export function createDefaultTopic(
  currentCount = 0,
  createdAt: string = new Date().toISOString(),
): CounterTopic {
  return {
    id: DEFAULT_TOPIC_ID,
    kind: 'default',
    currentCount: Math.max(0, Math.floor(currentCount)),
    createdAt,
  };
}

export function createCustomTopic(
  name: string,
  createdAt: string = new Date().toISOString(),
  id: string = `topic.${createLocalId()}`,
): CounterTopic {
  return {
    id,
    kind: 'custom',
    name: normalizeTopicName(name),
    currentCount: 0,
    createdAt,
    updatedAt: createdAt,
  };
}

export function getTopicDisplayName(topic: CounterTopic, t: TopicNameTranslator): string {
  if (topic.kind === 'default' || topic.id === DEFAULT_TOPIC_ID) {
    return t('topics.defaultName');
  }

  return topic.name?.trim() || t('topics.defaultName');
}

export function orderTopics(topics: readonly CounterTopic[]): CounterTopic[] {
  const defaults = topics.filter((topic) => topic.id === DEFAULT_TOPIC_ID || topic.kind === 'default');
  const custom = topics
    .filter((topic) => topic.id !== DEFAULT_TOPIC_ID && topic.kind !== 'default')
    .slice()
    .sort((left, right) => {
      const timeDelta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return left.id.localeCompare(right.id);
    });

  const defaultTopic = defaults[0] ?? createDefaultTopic();
  return [defaultTopic, ...custom];
}

export function getActiveTopic(
  topics: readonly CounterTopic[],
  activeTopicId: string | null | undefined,
): CounterTopic {
  const ordered = orderTopics(topics);
  return ordered.find((topic) => topic.id === activeTopicId) ?? ordered[0] ?? createDefaultTopic();
}

export function hasLifetimeIncrement(events: readonly CounterEvent[]): boolean {
  return events.some((event) => event.type === 'increment');
}

export function eventsForTopic(
  events: readonly CounterEvent[],
  topicId: string,
): CounterEvent[] {
  return events.filter((event) => event.topicId === topicId);
}

export function isReservedDefaultTopicName(value: string): boolean {
  return RESERVED_DEFAULT_TOPIC_NAMES.includes(
    topicNameKey(value) as (typeof RESERVED_DEFAULT_TOPIC_NAMES)[number],
  );
}

export function validateTopicName(
  rawName: string,
  topics: readonly CounterTopic[],
  options?: { excludeTopicId?: string; translate?: TopicNameTranslator },
): TopicNameError | null {
  if (topics.length >= MAX_TOPIC_COUNT && !options?.excludeTopicId) {
    return 'limit';
  }

  const name = normalizeTopicName(rawName);
  if (!name) {
    return 'required';
  }
  if (name.length > MAX_TOPIC_NAME_LENGTH) {
    return 'tooLong';
  }

  const key = topicNameKey(name);
  if (isReservedDefaultTopicName(name)) {
    return 'reserved';
  }

  const localizedDefault = options?.translate?.('topics.defaultName');
  if (localizedDefault && topicNameKey(localizedDefault) === key) {
    return 'reserved';
  }

  const conflict = topics.some((topic) => {
    if (options?.excludeTopicId && topic.id === options.excludeTopicId) {
      return false;
    }
    if (topic.kind === 'default' || topic.id === DEFAULT_TOPIC_ID) {
      return false;
    }
    return topic.name ? topicNameKey(topic.name) === key : false;
  });

  return conflict ? 'duplicate' : null;
}

export function resolveActiveTopicId(
  topics: readonly CounterTopic[],
  activeTopicId: string | null | undefined,
): string {
  return getActiveTopic(topics, activeTopicId).id;
}
