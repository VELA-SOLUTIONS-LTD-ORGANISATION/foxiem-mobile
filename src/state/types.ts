import type { SupportedLanguage } from '@/i18n/languages';

export type UserProfile = {
  name: string;
  username: string;
};

export type AppPreferences = {
  language: SupportedLanguage;
};

export type CounterState = {
  currentCount: number;
};

export type CounterTopicKind = 'default' | 'custom';

export type CounterTopic = {
  id: string;
  kind: CounterTopicKind;
  name?: string;
  currentCount: number;
  createdAt: string;
  updatedAt?: string;
};

export type CounterEventType = 'increment' | 'decrement' | 'reset';

/**
 * Canonical local counter activity.
 * Events are stored oldest → newest.
 * `createdAt` is an ISO-8601 UTC timestamp.
 * After topic migration every event belongs to exactly one topicId.
 */
export type CounterEvent = {
  id: string;
  topicId: string;
  type: CounterEventType;
  amount: number;
  previousValue: number;
  newValue: number;
  createdAt: string;
};

export type CounterDomainSnapshot = {
  schemaVersion: number;
  activeTopicId: string;
  topics: CounterTopic[];
  events: CounterEvent[];
};

export const DEFAULT_COUNTER: CounterState = {
  currentCount: 0,
};

export const DEFAULT_COUNTER_EVENTS: CounterEvent[] = [];
