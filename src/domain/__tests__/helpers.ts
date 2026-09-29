import { rebuildChain } from '../events';
import { createTracker, emptyDraft } from '../trackers';
import type { CountEvent, Tracker, TrackerDraft } from '../types';

export function at(year: number, month: number, day: number, hour = 12, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

export function makeTracker(overrides: Partial<TrackerDraft> = {}, created: Date = at(2026, 1, 1, 8)): Tracker {
  return createTracker(emptyDraft({ name: 'Test', ...overrides }), [], {
    now: created,
    id: `tracker.${overrides.name ?? 'test'}`,
  });
}

let counter = 0;

/** Build a consistent chain from `[date, amount]` pairs. */
export function makeEvents(tracker: Tracker, entries: [Date, number][]): CountEvent[] {
  const raw: CountEvent[] = entries.map(([date, amount]) => {
    counter += 1;
    return {
      id: `e${String(counter).padStart(6, '0')}`,
      trackerId: tracker.id,
      type: amount >= 0 ? 'increment' : 'decrement',
      amount,
      previousValue: 0,
      newValue: 0,
      createdAt: date.toISOString(),
      source: 'tap',
    };
  });
  return rebuildChain(tracker.startingValue, raw);
}

/** One entry per day with the given amounts, starting at `start`. */
export function dailyEntries(start: Date, amounts: number[], hour = 12): [Date, number][] {
  return amounts.flatMap((amount, index) => {
    if (amount === 0) {
      return [];
    }
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, hour);
    return [[date, amount] as [Date, number]];
  });
}
