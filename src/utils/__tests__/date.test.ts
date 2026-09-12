import {
  addLocalDays,
  getLocalDateKey,
  isLocalYesterday,
  isSameLocalDay,
  localDateFromKey,
  parseTimestamp,
  startOfLocalDay,
  startOfLocalWeekMonday,
} from '@/utils/date';
import { localDate } from '@/test/factories';

describe('date helpers', () => {
  it('startOfLocalDay zeroes time in local calendar', () => {
    const date = localDate(2026, 9, 12, 15, 45, 30);
    const start = startOfLocalDay(date);
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(12);
  });

  it('addLocalDays crosses month/year without ms day math', () => {
    expect(addLocalDays(localDate(2026, 9, 30), 1).getDate()).toBe(1);
    expect(addLocalDays(localDate(2026, 9, 30), 1).getMonth()).toBe(9);
  });

  it('startOfLocalWeekMonday treats Sunday as end of week', () => {
    const sunday = localDate(2026, 9, 13);
    const monday = startOfLocalWeekMonday(sunday);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(7);
  });

  it('getLocalDateKey / localDateFromKey round-trip with 0-indexed month keys', () => {
    const date = localDate(2026, 9, 12);
    const key = getLocalDateKey(date);
    expect(key).toBe('2026-8-12');
    const restored = localDateFromKey(key);
    expect(restored).not.toBeNull();
    expect(isSameLocalDay(restored!, date)).toBe(true);
  });

  it('isLocalYesterday uses calendar yesterday', () => {
    const ref = localDate(2026, 9, 12);
    expect(isLocalYesterday(localDate(2026, 9, 11), ref)).toBe(true);
    expect(isLocalYesterday(localDate(2026, 9, 10), ref)).toBe(false);
  });

  it('parseTimestamp accepts ISO and rejects invalid', () => {
    expect(parseTimestamp('2026-09-12T10:00:00.000Z')).toBeInstanceOf(Date);
    expect(parseTimestamp('not-a-date')).toBeNull();
  });

  it('groups near UTC midnight using local calendar day semantics', () => {
    const utcNearMidnight = new Date('2026-09-11T23:30:00.000Z');
    const key = getLocalDateKey(utcNearMidnight);
    const local = parseTimestamp('2026-09-11T23:30:00.000Z')!;
    expect(key).toBe(getLocalDateKey(local));
    expect(key.includes('-')).toBe(true);
  });
});
