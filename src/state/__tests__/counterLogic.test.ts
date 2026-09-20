import {
  applyCounterAction,
  assertEventInvariants,
  createLatestWinsPersistQueue,
  type CounterSnapshot,
} from '@/state/counterLogic';
import { DEFAULT_COUNTER, DEFAULT_COUNTER_EVENTS } from '@/state/types';

function empty(): CounterSnapshot {
  return { counter: { ...DEFAULT_COUNTER }, events: [...DEFAULT_COUNTER_EVENTS] };
}

describe('applyCounterAction', () => {
  it('+1 from 0 creates increment event 0→1', () => {
    const next = applyCounterAction(empty(), { type: 'increment', amount: 1 }, '2026-09-12T10:00:00.000Z');
    expect(next?.counter.currentCount).toBe(1);
    expect(next?.events).toHaveLength(1);
    expect(next?.events[0]).toMatchObject({
      type: 'increment',
      amount: 1,
      previousValue: 0,
      newValue: 1,
    });
  });

  it('+5 from 10 yields 15', () => {
    const start: CounterSnapshot = { counter: { currentCount: 10 }, events: [] };
    const next = applyCounterAction(start, { type: 'increment', amount: 5 });
    expect(next?.counter.currentCount).toBe(15);
    expect(next?.events[0]).toMatchObject({ amount: 5, previousValue: 10, newValue: 15 });
  });

  it('-1 from 10 yields 9 with amount -1', () => {
    const start: CounterSnapshot = { counter: { currentCount: 10 }, events: [] };
    const next = applyCounterAction(start, { type: 'decrement', amount: 1 });
    expect(next?.counter.currentCount).toBe(9);
    expect(next?.events[0]).toMatchObject({
      type: 'decrement',
      amount: -1,
      previousValue: 10,
      newValue: 9,
    });
  });

  it('-1 at zero creates no event', () => {
    expect(applyCounterAction(empty(), { type: 'decrement', amount: 1 })).toBeNull();
  });

  it('reset from 20 yields amount 0 and newValue 0', () => {
    const start: CounterSnapshot = { counter: { currentCount: 20 }, events: [] };
    const next = applyCounterAction(start, { type: 'reset' });
    expect(next?.counter.currentCount).toBe(0);
    expect(next?.events[0]).toMatchObject({
      type: 'reset',
      amount: 0,
      previousValue: 20,
      newValue: 0,
    });
  });

  it('reset at zero is a no-op', () => {
    expect(applyCounterAction(empty(), { type: 'reset' })).toBeNull();
  });

  it('20 rapid +1 actions produce chain 0→20', () => {
    let snapshot = empty();
    for (let i = 0; i < 20; i += 1) {
      const next = applyCounterAction(snapshot, { type: 'increment', amount: 1 });
      expect(next).not.toBeNull();
      snapshot = next!;
    }
    expect(snapshot.counter.currentCount).toBe(20);
    expect(snapshot.events).toHaveLength(20);
    assertEventInvariants(snapshot.events);
    expect(snapshot.events[0]?.previousValue).toBe(0);
    expect(snapshot.events[19]?.newValue).toBe(20);
  });

  it('10 rapid +5 actions produce counter 50', () => {
    let snapshot = empty();
    for (let i = 0; i < 10; i += 1) {
      snapshot = applyCounterAction(snapshot, { type: 'increment', amount: 5 })!;
    }
    expect(snapshot.counter.currentCount).toBe(50);
    expect(snapshot.events).toHaveLength(10);
    assertEventInvariants(snapshot.events);
  });

  it('mixed +1 +5 -1 +1 +5 yields 11', () => {
    let snapshot = empty();
    for (const action of [
      { type: 'increment' as const, amount: 1 },
      { type: 'increment' as const, amount: 5 },
      { type: 'decrement' as const, amount: 1 },
      { type: 'increment' as const, amount: 1 },
      { type: 'increment' as const, amount: 5 },
    ]) {
      snapshot = applyCounterAction(snapshot, action)!;
    }
    expect(snapshot.counter.currentCount).toBe(11);
    assertEventInvariants(snapshot.events);
  });

  it('deterministic 500-op sequence stays consistent', () => {
    const ops: Array<'inc1' | 'inc5' | 'dec' | 'reset'> = [];
    let seed = 42;
    for (let i = 0; i < 500; i += 1) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      const pick = seed % 4;
      ops.push(pick === 0 ? 'inc1' : pick === 1 ? 'inc5' : pick === 2 ? 'dec' : 'reset');
    }

    let snapshot = empty();
    let expected = 0;
    for (const op of ops) {
      if (op === 'inc1') {
        const next = applyCounterAction(snapshot, { type: 'increment', amount: 1 });
        if (next) {
          snapshot = next;
          expected += 1;
        }
      } else if (op === 'inc5') {
        const next = applyCounterAction(snapshot, { type: 'increment', amount: 5 });
        if (next) {
          snapshot = next;
          expected += 5;
        }
      } else if (op === 'dec') {
        const next = applyCounterAction(snapshot, { type: 'decrement', amount: 1 });
        if (next) {
          snapshot = next;
          expected = Math.max(0, expected - 1);
        }
      } else {
        const next = applyCounterAction(snapshot, { type: 'reset' });
        if (next) {
          snapshot = next;
          expected = 0;
        }
      }
      expect(snapshot.counter.currentCount).toBeGreaterThanOrEqual(0);
    }

    expect(snapshot.counter.currentCount).toBe(expected);
    assertEventInvariants(snapshot.events);
  });
});

describe('createLatestWinsPersistQueue', () => {
  it('older delayed writes cannot overwrite newer snapshots', async () => {
    const writes: number[] = [];
    let releaseFirst: (() => void) | undefined;

    const queue = createLatestWinsPersistQueue<CounterSnapshot>(async (snapshot) => {
      const count = snapshot.counter.currentCount;
      if (count === 1) {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      writes.push(count);
    });

    queue.enqueue({ counter: { currentCount: 1 }, events: [] });
    await Promise.resolve();
    queue.enqueue({ counter: { currentCount: 2 }, events: [] });
    queue.enqueue({ counter: { currentCount: 3 }, events: [] });

    releaseFirst?.();
    await queue.flush();

    expect(writes).toEqual([1, 3]);
  });
});
