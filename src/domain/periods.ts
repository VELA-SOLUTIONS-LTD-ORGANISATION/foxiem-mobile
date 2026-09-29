import type { TrackerPeriod, WeekStart } from './types';

export const DAY_MS = 86_400_000;

export type DateRange = {
  start: Date;
  /** Exclusive. */
  end: Date;
};

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = daysInMonth(target);
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    Math.min(date.getDate(), lastDay),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

export function startOfWeek(date: Date, weekStart: WeekStart): Date {
  const start = startOfDay(date);
  const diff = (start.getDay() - weekStart + 7) % 7;
  return addDays(start, -diff);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/** Whole local days between two dates, DST-safe. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** Sortable local day key: `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function dateFromDayKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function parseInstant(value: string | undefined | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function periodRange(period: TrackerPeriod, at: Date, weekStart: WeekStart): DateRange {
  switch (period) {
    case 'day': {
      const start = startOfDay(at);
      return { start, end: addDays(start, 1) };
    }
    case 'week': {
      const start = startOfWeek(at, weekStart);
      return { start, end: addDays(start, 7) };
    }
    case 'month': {
      const start = startOfMonth(at);
      return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
    }
    case 'all':
      return { start: new Date(0), end: new Date(8_640_000_000_000_000) };
  }
}

/** Range of the period `offset` periods away from the one containing `at` (-1 = previous). */
export function shiftedPeriodRange(
  period: Exclude<TrackerPeriod, 'all'>,
  at: Date,
  offset: number,
  weekStart: WeekStart,
): DateRange {
  const base = periodRange(period, at, weekStart).start;
  if (period === 'day') {
    const start = addDays(base, offset);
    return { start, end: addDays(start, 1) };
  }
  if (period === 'week') {
    const start = addDays(base, offset * 7);
    return { start, end: addDays(start, 7) };
  }
  const start = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
}

/**
 * The same elapsed point in the previous period, for like-for-like comparisons.
 * Returns the previous period's start and the cut-off matching `now`.
 */
export function previousComparableWindow(
  period: Exclude<TrackerPeriod, 'all'>,
  now: Date,
  weekStart: WeekStart,
): DateRange {
  const previous = shiftedPeriodRange(period, now, -1, weekStart);
  if (period === 'day') {
    return { start: previous.start, end: addDays(now, -1) };
  }
  if (period === 'week') {
    return { start: previous.start, end: addDays(now, -7) };
  }
  const cutoff = addMonths(now, -1);
  return { start: previous.start, end: cutoff.getTime() > previous.end.getTime() ? previous.end : cutoff };
}

/** 0..1 share of the current period that has elapsed. */
export function elapsedFraction(period: TrackerPeriod, now: Date, weekStart: WeekStart): number {
  if (period === 'all') {
    return 1;
  }
  const range = periodRange(period, now, weekStart);
  const total = range.end.getTime() - range.start.getTime();
  return Math.min(1, Math.max(0, (now.getTime() - range.start.getTime()) / total));
}

/** Local days of the period that are still ahead, including today. */
export function daysLeftInPeriod(period: TrackerPeriod, now: Date, weekStart: WeekStart): number {
  if (period === 'all') {
    return 0;
  }
  const range = periodRange(period, now, weekStart);
  return Math.max(1, daysBetween(now, range.end));
}

export function isInRange(date: Date, range: DateRange): boolean {
  const time = date.getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
}

export function eachDay(from: Date, toInclusive: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(from);
  const last = startOfDay(toInclusive);
  while (cursor.getTime() <= last.getTime()) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}
