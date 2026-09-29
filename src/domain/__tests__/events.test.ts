import {
  addEntry,
  applyTap,
  chainIsConsistent,
  currentPeriodValue,
  deleteEntry,
  rebuildChain,
  resetRunningValue,
  revertTaps,
  runningValue,
  updateEntry,
  type TapBurst,
} from '../events';
import { TAP_COALESCE_WINDOW_MS, type CountEvent } from '../types';

import { at, makeEvents, makeTracker } from './helpers';

const weekStart = 1 as const;

function tapMany(
  tracker: ReturnType<typeof makeTracker>,
  start: Date,
  count: number,
  gapMs: number,
  direction: 'up' | 'down' = 'up',
  initial: CountEvent[] = [],
) {
  let events = initial;
  let burst: TapBurst | null = null;
  for (let index = 0; index < count; index += 1) {
    const now = new Date(start.getTime() + index * gapMs);
    const result = applyTap(tracker, events, { direction, now, weekStart, burst });
    if (result) {
      events = result.events;
      burst = result.burst;
    }
  }
  return events;
}

describe('count events', () => {
  it('increments and decrements the running value with a consistent chain', () => {
    const tracker = makeTracker();
    const first = applyTap(tracker, [], { direction: 'up', now: at(2026, 3, 2, 9), weekStart })!;
    expect(first.event).toMatchObject({ type: 'increment', amount: 1, previousValue: 0, newValue: 1 });
    const second = applyTap(tracker, first.events, { direction: 'down', now: at(2026, 3, 2, 10), weekStart })!;
    expect(second.event).toMatchObject({ type: 'decrement', amount: -1, previousValue: 1, newValue: 0 });
    expect(runningValue(tracker, second.events)).toBe(0);
    expect(chainIsConsistent(tracker, second.events)).toBe(true);
  });

  it('uses the custom step and a custom amount', () => {
    const tracker = makeTracker({ step: 5 });
    const tap = applyTap(tracker, [], { direction: 'up', now: at(2026, 3, 2), weekStart })!;
    expect(tap.delta).toBe(5);
    const custom = applyTap(tracker, tap.events, { direction: 'up', amount: 17, now: at(2026, 3, 2, 14), weekStart })!;
    expect(runningValue(tracker, custom.events)).toBe(22);
  });

  it('never lets the value go below zero', () => {
    const tracker = makeTracker({ step: 5 });
    const events = makeEvents(tracker, [[at(2026, 3, 2, 9), 3]]);
    const tap = applyTap(tracker, events, { direction: 'down', now: at(2026, 3, 2, 10), weekStart })!;
    expect(tap.delta).toBe(-3);
    expect(applyTap(tracker, tap.events, { direction: 'down', now: at(2026, 3, 2, 11), weekStart })).toBeNull();
  });

  it('clamps decrements to the current period for periodic trackers', () => {
    const tracker = makeTracker({ intent: 'reach', period: 'day', target: 8 });
    const events = makeEvents(tracker, [[at(2026, 3, 1, 20), 6]]);
    // Nothing logged today yet, so − does nothing even though yesterday had 6.
    expect(applyTap(tracker, events, { direction: 'down', now: at(2026, 3, 2, 9), weekStart })).toBeNull();
  });

  it('records every rapid tap exactly (twenty taps in two seconds = 20)', () => {
    const tracker = makeTracker();
    const events = tapMany(tracker, at(2026, 3, 2, 9), 20, 100);
    expect(runningValue(tracker, events)).toBe(20);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ amount: 20, previousValue: 0, newValue: 20 });
    expect(chainIsConsistent(tracker, events)).toBe(true);
  });

  it('starts a new entry after the coalescing window, on direction change and at midnight', () => {
    const tracker = makeTracker();
    const slow = tapMany(tracker, at(2026, 3, 2, 9), 3, TAP_COALESCE_WINDOW_MS + 1);
    expect(slow).toHaveLength(3);

    let events = tapMany(tracker, at(2026, 3, 2, 9), 3, 200);
    const burst: TapBurst = { trackerId: tracker.id, eventId: events[0]!.id, direction: 'up', lastTapAt: at(2026, 3, 2, 9).getTime() + 400 };
    const down = applyTap(tracker, events, { direction: 'down', now: new Date(at(2026, 3, 2, 9).getTime() + 600), weekStart, burst })!;
    expect(down.merged).toBe(false);
    events = down.events;
    expect(events).toHaveLength(2);

    const lateNight = tapMany(tracker, new Date(2026, 2, 2, 23, 59, 59, 0), 3, 500);
    expect(lateNight).toHaveLength(2);
    expect(currentPeriodValue({ ...tracker, period: 'day' }, lateNight, at(2026, 3, 3, 8), weekStart)).toBe(1);
    expect(currentPeriodValue({ ...tracker, period: 'day' }, lateNight, at(2026, 3, 2, 23, 59), weekStart)).toBe(2);
  });

  it('undo reverts exactly the taps shown and removes empty entries', () => {
    const tracker = makeTracker();
    const events = tapMany(tracker, at(2026, 3, 2, 9), 3, 100);
    const partial = revertTaps(tracker, events, events[0]!.id, 1)!;
    expect(runningValue(tracker, partial)).toBe(2);
    const all = revertTaps(tracker, events, events[0]!.id, 3)!;
    expect(all).toHaveLength(0);
    expect(runningValue(tracker, all)).toBe(0);
  });

  it('resets running trackers without deleting history', () => {
    const tracker = makeTracker();
    const events = makeEvents(tracker, [[at(2026, 3, 2, 9), 7]]);
    const reset = resetRunningValue(tracker, events, at(2026, 3, 2, 10))!;
    expect(reset).toHaveLength(2);
    expect(reset[1]).toMatchObject({ type: 'reset', previousValue: 7, newValue: 0, amount: 0 });
    expect(runningValue(tracker, reset)).toBe(0);
    expect(resetRunningValue({ ...tracker, period: 'day' }, events, at(2026, 3, 2, 10))).toBeNull();
  });

  it('adds a past entry in chronological position', () => {
    const tracker = makeTracker();
    const events = makeEvents(tracker, [[at(2026, 3, 2, 9), 2], [at(2026, 3, 4, 9), 1]]);
    const next = addEntry(tracker, events, { amount: 5, at: at(2026, 3, 3, 9), note: ' forgot ', now: at(2026, 3, 4, 10) })!;
    expect(next.map((event) => event.newValue)).toEqual([2, 7, 8]);
    expect(next[1]!.note).toBe('forgot');
    expect(addEntry(tracker, events, { amount: 5, at: at(2026, 3, 9), now: at(2026, 3, 4) })).toBeNull();
    expect(addEntry(tracker, events, { amount: 0, at: at(2026, 3, 3), now: at(2026, 3, 4) })).toBeNull();
  });

  it('editing and deleting history re-derives every later value', () => {
    const tracker = makeTracker();
    const events = makeEvents(tracker, [[at(2026, 3, 2, 9), 5], [at(2026, 3, 2, 10), 1], [at(2026, 3, 2, 11), 1]]);
    const edited = updateEntry(tracker, events, events[0]!.id, { amount: 1 }, at(2026, 3, 2, 12))!;
    expect(edited.map((event) => event.newValue)).toEqual([1, 2, 3]);
    expect(edited[0]!.editedAt).toBeDefined();
    const moved = updateEntry(tracker, edited, edited[2]!.id, { at: at(2026, 3, 1, 9) }, at(2026, 3, 2, 12))!;
    expect(moved[0]!.id).toBe(edited[2]!.id);
    expect(chainIsConsistent(tracker, moved)).toBe(true);
    const deleted = deleteEntry(tracker, moved, moved[1]!.id)!;
    expect(runningValue(tracker, deleted)).toBe(2);
    expect(chainIsConsistent(tracker, deleted)).toBe(true);
  });

  it('clamps a later decrement if an earlier entry is deleted', () => {
    const tracker = makeTracker();
    const events = makeEvents(tracker, [[at(2026, 3, 2, 9), 1], [at(2026, 3, 2, 10), -1]]);
    const next = deleteEntry(tracker, events, events[0]!.id)!;
    expect(next[0]).toMatchObject({ amount: 0, previousValue: 0, newValue: 0 });
    expect(chainIsConsistent(tracker, next)).toBe(true);
  });

  it('rebuildChain honours starting value and reset events', () => {
    const tracker = makeTracker({ startingValue: 40 });
    const events = makeEvents(tracker, [[at(2026, 3, 2, 9), 2]]);
    expect(events[0]).toMatchObject({ previousValue: 40, newValue: 42 });
    const withReset = rebuildChain(40, [
      ...events,
      { ...events[0]!, id: 'r', type: 'reset', amount: 0, createdAt: at(2026, 3, 3).toISOString() },
      { ...events[0]!, id: 'z', amount: 3, createdAt: at(2026, 3, 4).toISOString() },
    ]);
    expect(withReset.map((event) => event.newValue)).toEqual([42, 0, 3]);
  });

  it('keeps entries with the same timestamp in the order they were recorded', () => {
    const tracker = makeTracker();
    const createdAt = at(2026, 3, 2, 9).toISOString();
    const base = { trackerId: tracker.id, createdAt, source: 'tap' as const };
    const recorded: CountEvent[] = [
      { ...base, id: 'z-up', type: 'increment', amount: 1, previousValue: 0, newValue: 1 },
      { ...base, id: 'a-down', type: 'decrement', amount: -1, previousValue: 1, newValue: 0 },
    ];
    const rebuilt = rebuildChain(0, recorded);
    expect(rebuilt.map((event) => [event.id, event.amount])).toEqual([
      ['z-up', 1],
      ['a-down', -1],
    ]);
    expect(chainIsConsistent(tracker, rebuilt)).toBe(true);
  });
});
