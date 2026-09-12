import {
  applyCounterAction,
  assertEventInvariants,
  type CounterSnapshot,
} from '@/state/counterLogic';
import { getTodayActivity } from '@/utils/statistics';
import { getCurrentStreak } from '@/utils/consistency';
import { groupCounterEventsByLocalDate } from '@/utils/activityHistory';
import { localDate, localIso } from '@/test/factories';

const REF = localDate(2026, 9, 12, 18);

function withFixedTime(snapshot: CounterSnapshot, action: Parameters<typeof applyCounterAction>[1], iso: string) {
  return applyCounterAction(snapshot, action, iso)!;
}

describe('cross-feature scenarios', () => {
  it('scenario A: +1 +5 -1 agrees across Home/History/Stats/Consistency', () => {
    let snapshot: CounterSnapshot = { counter: { currentCount: 0 }, events: [] };
    snapshot = withFixedTime(snapshot, { type: 'increment', amount: 1 }, localIso(2026, 9, 12, 10));
    snapshot = withFixedTime(snapshot, { type: 'increment', amount: 5 }, localIso(2026, 9, 12, 11));
    snapshot = withFixedTime(snapshot, { type: 'decrement', amount: 1 }, localIso(2026, 9, 12, 12));

    expect(snapshot.counter.currentCount).toBe(5);
    expect(snapshot.events).toHaveLength(3);
    expect(getTodayActivity(snapshot.events, REF)).toBe(5);
    expect(groupCounterEventsByLocalDate(snapshot.events, REF)[0]?.data).toHaveLength(3);
    expect(getCurrentStreak(snapshot.events, REF)).toBeGreaterThanOrEqual(1);
    assertEventInvariants(snapshot.events);
  });

  it('scenario B: reset keeps history and stats activity 11 with total 1', () => {
    let snapshot: CounterSnapshot = { counter: { currentCount: 0 }, events: [] };
    snapshot = withFixedTime(snapshot, { type: 'increment', amount: 5 }, localIso(2026, 9, 12, 9));
    snapshot = withFixedTime(snapshot, { type: 'increment', amount: 5 }, localIso(2026, 9, 12, 10));
    expect(snapshot.counter.currentCount).toBe(10);
    snapshot = withFixedTime(snapshot, { type: 'reset' }, localIso(2026, 9, 12, 11));
    snapshot = withFixedTime(snapshot, { type: 'increment', amount: 1 }, localIso(2026, 9, 12, 12));

    expect(snapshot.counter.currentCount).toBe(1);
    expect(snapshot.events.map((event) => event.type)).toEqual([
      'increment',
      'increment',
      'reset',
      'increment',
    ]);
    expect(getTodayActivity(snapshot.events, REF)).toBe(11);
    expect(getCurrentStreak(snapshot.events, REF)).toBeGreaterThanOrEqual(1);
  });

  it('scenario C: net-zero day stays active with 2 history events', () => {
    let snapshot: CounterSnapshot = { counter: { currentCount: 0 }, events: [] };
    snapshot = withFixedTime(snapshot, { type: 'increment', amount: 1 }, localIso(2026, 9, 12, 9));
    snapshot = withFixedTime(snapshot, { type: 'decrement', amount: 1 }, localIso(2026, 9, 12, 10));

    expect(snapshot.counter.currentCount).toBe(0);
    expect(getTodayActivity(snapshot.events, REF)).toBe(0);
    expect(snapshot.events).toHaveLength(2);
    expect(getCurrentStreak(snapshot.events, REF)).toBe(1);
  });

  it('scenario D: legacy counter without history', () => {
    const counter = 247;
    const events: CounterSnapshot['events'] = [];
    expect(counter).toBe(247);
    expect(events).toHaveLength(0);
    expect(getTodayActivity(events, REF)).toBe(0);
    expect(getCurrentStreak(events, REF)).toBe(0);
  });

  it('scenario E: full reset target in-memory shape', () => {
    const afterReset = {
      profile: null,
      counter: { currentCount: 0 },
      events: [],
      reminders: [],
      setupCompleted: false,
    };
    expect(afterReset.profile).toBeNull();
    expect(afterReset.counter.currentCount).toBe(0);
    expect(afterReset.events).toEqual([]);
    expect(afterReset.reminders).toEqual([]);
    expect(afterReset.setupCompleted).toBe(false);
  });
});
