import { createLocalId } from '@/utils/id';

import { eventsForTopic, orderTopics, resolveActiveTopicId, DEFAULT_TOPIC_ID } from './topics';
import type { CounterDomainSnapshot, CounterEvent, CounterState } from './types';

export type CounterAction =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount?: number }
  | { type: 'reset' };

export type CounterSnapshot = {
  counter: CounterState;
  events: CounterEvent[];
};

export function createCounterEvent(
  type: CounterEvent['type'],
  amount: number,
  previousValue: number,
  newValue: number,
  createdAt: string = new Date().toISOString(),
  id: string = createLocalId(),
  topicId: string = DEFAULT_TOPIC_ID,
): CounterEvent {
  return {
    id,
    topicId,
    type,
    amount,
    previousValue,
    newValue,
    createdAt,
  };
}

/**
 * Pure counter transition used by AppState.
 * Returns null when the action is a no-op (invalid amount, -1 at 0, reset at 0).
 */
export function applyCounterAction(
  snapshot: CounterSnapshot,
  action: CounterAction,
  createdAt: string = new Date().toISOString(),
  topicId: string = DEFAULT_TOPIC_ID,
): CounterSnapshot | null {
  const previousValue = snapshot.counter.currentCount;

  if (action.type === 'increment') {
    const delta = Math.floor(action.amount);
    if (!Number.isFinite(delta) || delta <= 0) {
      return null;
    }

    const newValue = previousValue + delta;
    return {
      counter: { currentCount: newValue },
      events: [
        ...snapshot.events,
        createCounterEvent('increment', delta, previousValue, newValue, createdAt, createLocalId(), topicId),
      ],
    };
  }

  if (action.type === 'decrement') {
    const delta = Math.floor(action.amount ?? 1);
    if (!Number.isFinite(delta) || delta <= 0) {
      return null;
    }

    const newValue = Math.max(0, previousValue - delta);
    if (newValue === previousValue) {
      return null;
    }

    return {
      counter: { currentCount: newValue },
      events: [
        ...snapshot.events,
        createCounterEvent(
          'decrement',
          newValue - previousValue,
          previousValue,
          newValue,
          createdAt,
          createLocalId(),
          topicId,
        ),
      ],
    };
  }

  if (previousValue <= 0) {
    return null;
  }

  return {
    counter: { currentCount: 0 },
    events: [
      ...snapshot.events,
      createCounterEvent('reset', 0, previousValue, 0, createdAt, createLocalId(), topicId),
    ],
  };
}

export function applyActionToDomain(
  domain: CounterDomainSnapshot,
  topicId: string,
  action: CounterAction,
  createdAt: string = new Date().toISOString(),
): CounterDomainSnapshot | null {
  const target = domain.topics.find((topic) => topic.id === topicId);
  if (!target) {
    return null;
  }

  const next = applyCounterAction(
    { counter: { currentCount: target.currentCount }, events: eventsForTopic(domain.events, target.id) },
    action,
    createdAt,
    target.id,
  );
  if (!next) {
    return null;
  }

  const now = createdAt;
  return {
    schemaVersion: domain.schemaVersion,
    activeTopicId: resolveActiveTopicId(domain.topics, domain.activeTopicId),
    topics: orderTopics(
      domain.topics.map((topic) =>
        topic.id === target.id
          ? { ...topic, currentCount: next.counter.currentCount, updatedAt: now }
          : topic,
      ),
    ),
    events: [...domain.events.filter((event) => event.topicId !== target.id), ...next.events],
  };
}

export function assertEventInvariants(events: readonly CounterEvent[]): void {
  for (const event of events) {
    if (event.type === 'reset') {
      if (event.amount !== 0 || event.newValue !== 0) {
        throw new Error(`Invalid reset event ${event.id}`);
      }
      continue;
    }

    if (event.previousValue + event.amount !== event.newValue) {
      throw new Error(`Broken event chain ${event.id}`);
    }
  }
}

/**
 * Latest-wins serialized persist queue matching AppStateProvider behaviour.
 */
export function createLatestWinsPersistQueue<T>(
  write: (snapshot: T) => Promise<void>,
): {
  enqueue: (snapshot: T) => void;
  flush: () => Promise<void>;
} {
  let pending: T | null = null;
  let tail: Promise<void> = Promise.resolve();

  const enqueue = (snapshot: T) => {
    pending = snapshot;
    tail = tail
      .then(async () => {
        while (pending) {
          const next = pending;
          pending = null;
          try {
            await write(next);
          } catch {
            // Match AppState: swallow write errors after optional DEV warn.
          }
        }
      })
      .catch(() => undefined);
  };

  return {
    enqueue,
    flush: () => tail,
  };
}
