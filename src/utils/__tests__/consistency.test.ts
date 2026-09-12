import {
  getBestStreak,
  getConsistencySummary,
  getCurrentStreak,
  getCurrentWeekConsistency,
} from '@/utils/consistency';
import {
  decrementEvent,
  incrementEvent,
  localDate,
  localIso,
  resetEvent,
  resetEventSeq,
} from '@/test/factories';

beforeEach(() => {
  resetEventSeq();
});

describe('consistency active days', () => {
  const ref = localDate(2026, 9, 12);

  it('increment and decrement create active days; reset-only does not', () => {
    const withInc = [incrementEvent(0, 1, localIso(2026, 9, 12))];
    const withDec = [decrementEvent(2, 1, localIso(2026, 9, 12))];
    const resetOnly = [resetEvent(5, localIso(2026, 9, 12))];

    expect(getCurrentStreak(withInc, ref)).toBe(1);
    expect(getCurrentStreak(withDec, ref)).toBe(1);
    expect(getCurrentStreak(resetOnly, ref)).toBe(0);
  });

  it('multiple events same day count as one active day', () => {
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 12, 9)),
      incrementEvent(1, 1, localIso(2026, 9, 12, 10)),
      incrementEvent(2, 1, localIso(2026, 9, 12, 11)),
    ];
    expect(getCurrentStreak(events, ref)).toBe(1);
    expect(getBestStreak(events)).toBe(1);
  });

  it('net-zero day (+1 -1) is still active', () => {
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 12, 9)),
      decrementEvent(1, 1, localIso(2026, 9, 12, 10)),
    ];
    expect(getCurrentStreak(events, ref)).toBe(1);
  });
});

describe('current streak', () => {
  it('includes today when today is active', () => {
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 10)),
      incrementEvent(1, 1, localIso(2026, 9, 11)),
      incrementEvent(2, 1, localIso(2026, 9, 12)),
    ];
    expect(getCurrentStreak(events, localDate(2026, 9, 12))).toBe(3);
  });

  it('applies yesterday grace when today is inactive', () => {
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 10)),
      incrementEvent(1, 1, localIso(2026, 9, 11)),
    ];
    expect(getCurrentStreak(events, localDate(2026, 9, 12))).toBe(2);
  });

  it('returns 0 when today and yesterday are inactive', () => {
    const events = [incrementEvent(0, 1, localIso(2026, 9, 9))];
    expect(getCurrentStreak(events, localDate(2026, 9, 12))).toBe(0);
  });

  it('three days ending two days ago yields 0', () => {
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 8)),
      incrementEvent(1, 1, localIso(2026, 9, 9)),
      incrementEvent(2, 1, localIso(2026, 9, 10)),
    ];
    expect(getCurrentStreak(events, localDate(2026, 9, 12))).toBe(0);
  });
});

describe('best streak and week states', () => {
  it('computes best streak across gaps', () => {
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 1)),
      incrementEvent(1, 1, localIso(2026, 9, 2)),
      incrementEvent(2, 1, localIso(2026, 9, 3)),
      incrementEvent(3, 1, localIso(2026, 9, 5)),
      incrementEvent(4, 1, localIso(2026, 9, 6)),
      incrementEvent(5, 1, localIso(2026, 9, 10)),
      incrementEvent(6, 1, localIso(2026, 9, 11)),
      incrementEvent(7, 1, localIso(2026, 9, 12)),
      incrementEvent(8, 1, localIso(2026, 9, 13)),
    ];
    expect(getBestStreak(events)).toBe(4);
  });

  it('marks future weekdays as future, never missed', () => {
    // Wednesday 2026-09-09
    const ref = localDate(2026, 9, 9, 12);
    const events = [incrementEvent(0, 1, localIso(2026, 9, 7))];
    const week = getCurrentWeekConsistency(events, ref);
    expect(week.find((d) => d.weekday === 'monday')?.state).toBe('active');
    expect(week.find((d) => d.weekday === 'wednesday')?.state).toBe('todayPending');
    expect(week.find((d) => d.weekday === 'thursday')?.state).toBe('future');
    expect(week.find((d) => d.weekday === 'sunday')?.state).toBe('future');
    expect(week.every((d) => d.state !== 'inactivePast' || d.weekday === 'tuesday')).toBe(true);
  });

  it('summary aggregates streak and active week days', () => {
    const ref = localDate(2026, 9, 12);
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 11)),
      incrementEvent(1, 1, localIso(2026, 9, 12)),
    ];
    const summary = getConsistencySummary(events, ref);
    expect(summary.currentStreak).toBe(2);
    expect(summary.activeDaysThisWeek).toBeGreaterThanOrEqual(2);
  });
});
