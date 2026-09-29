import { createLocalId } from '@/utils/id';

import { isSameDay, parseInstant, periodRange } from './periods';
import {
  TAP_COALESCE_WINDOW_MS,
  TRACKER_LIMITS,
  type CountEvent,
  type Tracker,
  type WeekStart,
} from './types';

export type TapDirection = 'up' | 'down';

/** In-memory marker for the entry currently absorbing rapid taps. */
export type TapBurst = {
  trackerId: string;
  eventId: string;
  direction: TapDirection;
  lastTapAt: number;
};

export type TapResult = {
  events: CountEvent[];
  event: CountEvent;
  /** Signed change applied by this tap. */
  delta: number;
  merged: boolean;
  burst: TapBurst;
};

export function compareEvents(left: CountEvent, right: CountEvent): number {
  return Date.parse(left.createdAt) - Date.parse(right.createdAt);
}

/** Chronological; events with the same timestamp keep the order they were recorded in. */
export function sortEvents(events: readonly CountEvent[]): CountEvent[] {
  return events
    .map((event, index) => ({ event, index, time: Date.parse(event.createdAt) }))
    .sort((left, right) => left.time - right.time || left.index - right.index)
    .map((item) => item.event);
}

/** Running value after all events. */
export function runningValue(tracker: Pick<Tracker, 'startingValue'>, events: readonly CountEvent[]): number {
  const last = events[events.length - 1];
  return last ? last.newValue : tracker.startingValue;
}

/**
 * Recompute `previousValue` / `newValue` for every event from the starting value.
 * Decrements that would go below zero after an edit are clamped, and their amount is
 * corrected so `previousValue + amount === newValue` always holds.
 */
export function rebuildChain(startingValue: number, events: readonly CountEvent[]): CountEvent[] {
  let value = Math.max(0, startingValue);
  return sortEvents(events).map((event) => {
    const previousValue = value;
    if (event.type === 'reset') {
      value = 0;
      return { ...event, amount: 0, previousValue, newValue: 0 };
    }
    if (event.type === 'adjust') {
      value = Math.max(0, event.newValue);
      return { ...event, amount: value - previousValue, previousValue, newValue: value };
    }
    const next = Math.max(0, previousValue + event.amount);
    value = next;
    return { ...event, amount: next - previousValue, previousValue, newValue: next };
  });
}

export function sumActivity(events: readonly CountEvent[], start: Date, end: Date): number {
  const from = start.getTime();
  const to = end.getTime();
  let total = 0;
  for (const event of events) {
    if (event.type !== 'increment' && event.type !== 'decrement') {
      continue;
    }
    const time = Date.parse(event.createdAt);
    if (time >= from && time < to) {
      total += event.amount;
    }
  }
  return total;
}

/** The value a user sees for the tracker's current period (running value for `all`). */
export function currentPeriodValue(
  tracker: Tracker,
  events: readonly CountEvent[],
  now: Date,
  weekStart: WeekStart,
): number {
  if (tracker.period === 'all') {
    return runningValue(tracker, events);
  }
  const range = periodRange(tracker.period, now, weekStart);
  return Math.max(0, sumActivity(events, range.start, range.end));
}

function normalizeAmount(value: number | undefined, fallback: number): number {
  const amount = Math.floor(value ?? fallback);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.min(amount, TRACKER_LIMITS.entryAmountMax);
}

function canCoalesce(
  last: CountEvent | undefined,
  burst: TapBurst | null | undefined,
  tracker: Tracker,
  direction: TapDirection,
  now: Date,
): boolean {
  if (!last || !burst) {
    return false;
  }
  const expectedType = direction === 'up' ? 'increment' : 'decrement';
  const lastAt = parseInstant(last.createdAt);
  return (
    burst.trackerId === tracker.id &&
    burst.eventId === last.id &&
    burst.direction === direction &&
    last.type === expectedType &&
    now.getTime() - burst.lastTapAt >= 0 &&
    now.getTime() - burst.lastTapAt <= TAP_COALESCE_WINDOW_MS &&
    lastAt !== null &&
    isSameDay(lastAt, now)
  );
}

/**
 * One press of + or −. Pure: callers pass the latest events and get the next array back.
 * Rapid presses merge into the latest entry so history stays readable and storage stays small;
 * the total is always exact.
 */
export function applyTap(
  tracker: Tracker,
  events: readonly CountEvent[],
  input: {
    direction: TapDirection;
    amount?: number;
    now: Date;
    weekStart: WeekStart;
    burst?: TapBurst | null;
    id?: string;
  },
): TapResult | null {
  const requested = normalizeAmount(input.amount, tracker.step);
  if (requested === 0) {
    return null;
  }

  const running = runningValue(tracker, events);
  let delta: number;
  if (input.direction === 'up') {
    delta = requested;
  } else {
    const available =
      tracker.period === 'all'
        ? running
        : Math.min(running, currentPeriodValue(tracker, events, input.now, input.weekStart));
    delta = -Math.min(requested, Math.max(0, available));
    if (delta === 0) {
      return null;
    }
  }

  const last = events[events.length - 1];
  const nowIso = input.now.toISOString();

  if (last && canCoalesce(last, input.burst, tracker, input.direction, input.now)) {
    const merged: CountEvent = {
      ...last,
      amount: last.amount + delta,
      newValue: last.newValue + delta,
    };
    const next = [...events.slice(0, -1), merged];
    return {
      events: next,
      event: merged,
      delta,
      merged: true,
      burst: { ...input.burst!, lastTapAt: input.now.getTime() },
    };
  }

  const event: CountEvent = {
    id: input.id ?? createLocalId(),
    trackerId: tracker.id,
    type: input.direction === 'up' ? 'increment' : 'decrement',
    amount: delta,
    previousValue: running,
    newValue: running + delta,
    createdAt: nowIso,
    source: 'tap',
  };

  const lastTime = last ? Date.parse(last.createdAt) : Number.NEGATIVE_INFINITY;
  const next =
    input.now.getTime() >= lastTime
      ? [...events, event]
      : rebuildChain(tracker.startingValue, [...events, event]);

  return {
    events: next,
    event: next.find((item) => item.id === event.id) ?? event,
    delta,
    merged: false,
    burst: {
      trackerId: tracker.id,
      eventId: event.id,
      direction: input.direction,
      lastTapAt: input.now.getTime(),
    },
  };
}

/** Undo the taps a snackbar is showing. Removes the entry when nothing is left of it. */
export function revertTaps(
  tracker: Tracker,
  events: readonly CountEvent[],
  eventId: string,
  delta: number,
): CountEvent[] | null {
  const target = events.find((event) => event.id === eventId);
  if (!target || delta === 0 || !(target.type === 'increment' || target.type === 'decrement')) {
    return null;
  }
  const remaining = target.amount - delta;
  const sameSign = Math.sign(remaining) === Math.sign(target.amount);
  const next =
    remaining !== 0 && sameSign
      ? events.map((event) => (event.id === eventId ? { ...event, amount: remaining } : event))
      : events.filter((event) => event.id !== eventId);
  return rebuildChain(tracker.startingValue, next);
}

export function resetRunningValue(
  tracker: Tracker,
  events: readonly CountEvent[],
  now: Date,
  id: string = createLocalId(),
): CountEvent[] | null {
  const running = runningValue(tracker, events);
  if (tracker.period !== 'all' || running <= 0) {
    return null;
  }
  const event: CountEvent = {
    id,
    trackerId: tracker.id,
    type: 'reset',
    amount: 0,
    previousValue: running,
    newValue: 0,
    createdAt: now.toISOString(),
    source: 'tap',
  };
  return rebuildChain(tracker.startingValue, [...events, event]);
}

function cleanNote(note: string | undefined | null): string | undefined {
  const trimmed = note?.trim().slice(0, TRACKER_LIMITS.eventNoteMaxLength);
  return trimmed ? trimmed : undefined;
}

/** A manual entry for something that happened earlier (or now). Amount is always positive. */
export function addEntry(
  tracker: Tracker,
  events: readonly CountEvent[],
  input: { amount: number; at: Date; note?: string; id?: string; now?: Date },
): CountEvent[] | null {
  const amount = normalizeAmount(input.amount, 0);
  const now = input.now ?? new Date();
  if (amount === 0 || input.at.getTime() > now.getTime() + 60_000) {
    return null;
  }
  const event: CountEvent = {
    id: input.id ?? createLocalId(),
    trackerId: tracker.id,
    type: 'increment',
    amount,
    previousValue: 0,
    newValue: 0,
    createdAt: input.at.toISOString(),
    note: cleanNote(input.note),
    source: 'entry',
  };
  return rebuildChain(tracker.startingValue, [...events, event]);
}

export type EntryPatch = {
  /** Magnitude; the entry keeps its direction. */
  amount?: number;
  at?: Date;
  note?: string | null;
};

export function updateEntry(
  tracker: Tracker,
  events: readonly CountEvent[],
  eventId: string,
  patch: EntryPatch,
  now: Date = new Date(),
): CountEvent[] | null {
  const target = events.find((event) => event.id === eventId);
  if (!target) {
    return null;
  }
  const next: CountEvent = { ...target, editedAt: now.toISOString() };

  if (patch.amount !== undefined) {
    if (target.type !== 'increment' && target.type !== 'decrement') {
      return null;
    }
    const magnitude = normalizeAmount(patch.amount, 0);
    if (magnitude === 0) {
      return null;
    }
    next.amount = target.type === 'increment' ? magnitude : -magnitude;
  }

  if (patch.at) {
    if (patch.at.getTime() > now.getTime() + 60_000) {
      return null;
    }
    next.createdAt = patch.at.toISOString();
  }

  if (patch.note !== undefined) {
    const note = cleanNote(patch.note);
    if (note) {
      next.note = note;
    } else {
      delete next.note;
    }
  }

  return rebuildChain(
    tracker.startingValue,
    events.map((event) => (event.id === eventId ? next : event)),
  );
}

export function deleteEntry(
  tracker: Tracker,
  events: readonly CountEvent[],
  eventId: string,
): CountEvent[] | null {
  if (!events.some((event) => event.id === eventId)) {
    return null;
  }
  return rebuildChain(
    tracker.startingValue,
    events.filter((event) => event.id !== eventId),
  );
}

/** Invariants every stored chain must satisfy; used by tests and migration checks. */
export function chainIsConsistent(tracker: Pick<Tracker, 'startingValue'>, events: readonly CountEvent[]): boolean {
  let value = Math.max(0, tracker.startingValue);
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (index > 0 && compareEvents(events[index - 1]!, event) > 0) {
      return false;
    }
    if (event.previousValue !== value) {
      return false;
    }
    if (event.type === 'reset') {
      if (event.newValue !== 0 || event.amount !== 0) {
        return false;
      }
    } else if (event.previousValue + event.amount !== event.newValue || event.newValue < 0) {
      return false;
    }
    value = event.newValue;
  }
  return true;
}
