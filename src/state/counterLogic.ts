import { createLocalId } from '@/utils/id';

import type { CounterEvent, CounterState } from './types';

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
): CounterEvent {
  return {
    id,
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
        createCounterEvent('increment', delta, previousValue, newValue, createdAt),
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
        ),
      ],
    };
  }

  if (previousValue <= 0) {
    return null;
  }

  return {
    counter: { currentCount: 0 },
    events: [...snapshot.events, createCounterEvent('reset', 0, previousValue, 0, createdAt)],
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

export type PersistSnapshot = {
  counter: CounterState;
  events: CounterEvent[];
};

/**
 * Latest-wins serialized persist queue matching AppStateProvider behaviour.
 */
export function createLatestWinsPersistQueue(
  write: (snapshot: PersistSnapshot) => Promise<void>,
): {
  enqueue: (snapshot: PersistSnapshot) => void;
  flush: () => Promise<void>;
} {
  let pending: PersistSnapshot | null = null;
  let tail: Promise<void> = Promise.resolve();

  const enqueue = (snapshot: PersistSnapshot) => {
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
