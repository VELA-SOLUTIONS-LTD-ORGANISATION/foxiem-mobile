import {
  activityAmount,
  getDayBuckets,
  getMonthActivity,
  getMonthBuckets,
  getTodayActivity,
  getWeekActivity,
  getWeekBuckets,
  getYearBuckets,
} from '@/utils/statistics';
import {
  decrementEvent,
  incrementEvent,
  localDate,
  localIso,
  resetEvent,
  resetEventSeq,
} from '@/test/factories';

const REF = localDate(2026, 9, 12, 15, 0);

beforeEach(() => {
  resetEventSeq();
});

describe('statistics summaries', () => {
  it('today sums signed activity only for reference local day', () => {
    const events = [
      incrementEvent(0, 5, localIso(2026, 9, 12, 10)),
      decrementEvent(5, 1, localIso(2026, 9, 12, 11)),
      incrementEvent(4, 10, localIso(2026, 9, 11, 10)),
    ];
    expect(getTodayActivity(events, REF)).toBe(4);
  });

  it('week/month use Monday-start week and calendar month', () => {
    const events = [
      incrementEvent(0, 2, localIso(2026, 9, 8, 9)), // Monday of week
      incrementEvent(2, 3, localIso(2026, 9, 12, 9)),
      incrementEvent(5, 7, localIso(2026, 9, 1, 9)),
    ];
    expect(getWeekActivity(events, REF)).toBe(5);
    expect(getMonthActivity(events, REF)).toBe(12);
  });

  it('reset contributes 0 activity; period net is 25 for +20 reset +5', () => {
    const events = [
      incrementEvent(0, 20, localIso(2026, 9, 12, 9)),
      resetEvent(20, localIso(2026, 9, 12, 10)),
      incrementEvent(0, 5, localIso(2026, 9, 12, 11)),
    ];
    expect(activityAmount(events[1]!)).toBe(0);
    expect(getTodayActivity(events, REF)).toBe(25);
  });

  it('allows net-negative period totals', () => {
    const events = [
      decrementEvent(2, 1, localIso(2026, 9, 12, 9)),
      decrementEvent(1, 1, localIso(2026, 9, 12, 10)),
      incrementEvent(0, 1, localIso(2026, 9, 12, 11)),
    ];
    expect(getTodayActivity(events, REF)).toBe(-1);
  });
});

describe('day buckets', () => {
  const cases: Array<[number, number, string]> = [
    [3, 59, '00'],
    [4, 0, '04'],
    [7, 59, '04'],
    [8, 0, '08'],
    [11, 59, '08'],
    [12, 0, '12'],
    [15, 59, '12'],
    [16, 0, '16'],
    [19, 59, '16'],
    [20, 0, '20'],
    [23, 59, '20'],
  ];

  it.each(cases)('%i:%i falls in bucket %s', (hour, minute, key) => {
    const events = [incrementEvent(0, 1, localIso(2026, 9, 12, hour, minute))];
    const buckets = getDayBuckets(events, REF);
    const hit = buckets.find((bucket) => bucket.value === 1);
    expect(hit?.key).toBe(key);
    expect(buckets).toHaveLength(6);
  });
});

describe('week / month / year buckets', () => {
  it('places Monday and Sunday in the same Monday-start week', () => {
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 7, 12)), // Monday
      incrementEvent(1, 2, localIso(2026, 9, 13, 12)), // Sunday
    ];
    const ref = localDate(2026, 9, 10);
    const buckets = getWeekBuckets(events, ref);
    expect(buckets.find((b) => b.key === 'monday')?.value).toBe(1);
    expect(buckets.find((b) => b.key === 'sunday')?.value).toBe(2);
  });

  it('keeps Dec 29 Mon – Jan 4 Sun in one week when referenced from Dec 31', () => {
    const events = [
      incrementEvent(0, 1, localIso(2025, 12, 29, 12)),
      incrementEvent(1, 1, localIso(2026, 1, 4, 12)),
    ];
    const buckets = getWeekBuckets(events, localDate(2025, 12, 31));
    expect(buckets.find((b) => b.key === 'monday')?.value).toBe(1);
    expect(buckets.find((b) => b.key === 'sunday')?.value).toBe(1);
  });

  it('month buckets follow 1–7, 8–14, 15–21, 22–28, 29–end', () => {
    const events = [
      incrementEvent(0, 1, localIso(2026, 9, 1)),
      incrementEvent(1, 1, localIso(2026, 9, 8)),
      incrementEvent(2, 1, localIso(2026, 9, 15)),
      incrementEvent(3, 1, localIso(2026, 9, 22)),
      incrementEvent(4, 1, localIso(2026, 9, 30)),
    ];
    const buckets = getMonthBuckets(events, REF);
    expect(buckets.map((b) => b.key)).toEqual(['w1', 'w2', 'w3', 'w4', 'w5']);
    expect(buckets.map((b) => b.value)).toEqual([1, 1, 1, 1, 1]);
  });

  it('year buckets cover 12 months and exclude previous year', () => {
    const events = [
      incrementEvent(0, 3, localIso(2025, 12, 31)),
      incrementEvent(3, 4, localIso(2026, 1, 2)),
      incrementEvent(7, 5, localIso(2026, 9, 12)),
    ];
    const buckets = getYearBuckets(events, REF);
    expect(buckets).toHaveLength(12);
    expect(buckets.find((b) => b.key === 'january')?.value).toBe(4);
    expect(buckets.find((b) => b.key === 'september')?.value).toBe(5);
    expect(buckets.reduce((sum, b) => sum + b.value, 0)).toBe(9);
  });
});
