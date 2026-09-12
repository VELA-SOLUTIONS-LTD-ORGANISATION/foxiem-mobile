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

export type CounterEventType = 'increment' | 'decrement' | 'reset';

/**
 * Canonical local counter activity.
 * Events are stored oldest → newest.
 * `createdAt` is an ISO-8601 UTC timestamp.
 */
export type CounterEvent = {
  id: string;
  type: CounterEventType;
  amount: number;
  previousValue: number;
  newValue: number;
  createdAt: string;
};

export const DEFAULT_COUNTER: CounterState = {
  currentCount: 0,
};

export const DEFAULT_COUNTER_EVENTS: CounterEvent[] = [];
