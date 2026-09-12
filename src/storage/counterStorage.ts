import type { CounterEvent, CounterEventType, CounterState } from '@/state/types';
import { DEFAULT_COUNTER, DEFAULT_COUNTER_EVENTS } from '@/state/types';

import { readJson, writeJson } from './appStorage';
import { STORAGE_KEYS } from './keys';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCounterEventType(value: unknown): value is CounterEventType {
  return value === 'increment' || value === 'decrement' || value === 'reset';
}

function parseCounterEvent(value: unknown): CounterEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, type, amount, previousValue, newValue, createdAt } = value;
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    !isCounterEventType(type) ||
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    typeof previousValue !== 'number' ||
    !Number.isFinite(previousValue) ||
    typeof newValue !== 'number' ||
    !Number.isFinite(newValue) ||
    typeof createdAt !== 'string' ||
    Number.isNaN(Date.parse(createdAt))
  ) {
    return null;
  }

  return {
    id,
    type,
    amount,
    previousValue,
    newValue,
    createdAt,
  };
}

function compareEvents(left: CounterEvent, right: CounterEvent): number {
  const timeDelta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  if (timeDelta !== 0) {
    return timeDelta;
  }

  return left.id.localeCompare(right.id);
}

export function parseCounterState(value: unknown): CounterState {
  if (!isRecord(value) || typeof value.currentCount !== 'number' || !Number.isFinite(value.currentCount)) {
    return DEFAULT_COUNTER;
  }

  return { currentCount: Math.max(0, Math.floor(value.currentCount)) };
}

/**
 * Stored convention: oldest → newest.
 * Grouping always uses `createdAt`, never array position.
 * Previous `{ entries }` mock payloads are ignored, not converted into events.
 */
export function parseCounterEvents(value: unknown): CounterEvent[] {
  if (value == null) {
    return [...DEFAULT_COUNTER_EVENTS];
  }

  if (isRecord(value) && Array.isArray(value.entries) && !Array.isArray(value.events)) {
    return [...DEFAULT_COUNTER_EVENTS];
  }

  const list = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.events)
      ? value.events
      : null;

  if (!list) {
    return [...DEFAULT_COUNTER_EVENTS];
  }

  return list.flatMap((item) => {
    const event = parseCounterEvent(item);
    return event ? [event] : [];
  }).sort(compareEvents);
}

export async function loadCounterState(): Promise<CounterState> {
  const stored = await readJson<unknown>(STORAGE_KEYS.counter);
  return parseCounterState(stored);
}

export async function saveCounterState(counter: CounterState): Promise<void> {
  await writeJson(STORAGE_KEYS.counter, counter);
}

export async function loadCounterEvents(): Promise<CounterEvent[]> {
  const stored = await readJson<unknown>(STORAGE_KEYS.history);
  return parseCounterEvents(stored);
}

export async function saveCounterEvents(events: readonly CounterEvent[]): Promise<void> {
  await writeJson(STORAGE_KEYS.history, [...events].sort(compareEvents));
}
