import type { CounterEvent } from '@/state/types';
import {
  addLocalDays,
  daysInLocalMonth,
  isInLocalRange,
  parseTimestamp,
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalWeekMonday,
  startOfLocalYear,
} from '@/utils/date';

export type StatisticBucket = {
  key: string;
  value: number;
};

const DAY_BUCKET_HOURS = [0, 4, 8, 12, 16, 20] as const;
const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

function isActivityEvent(event: CounterEvent): boolean {
  return event.type === 'increment' || event.type === 'decrement';
}

export function activityAmount(event: CounterEvent): number {
  if (!isActivityEvent(event)) {
    return 0;
  }

  return event.amount;
}

function eventLocalDate(event: CounterEvent): Date | null {
  return parseTimestamp(event.createdAt);
}

function sumActivity(events: readonly CounterEvent[], start: Date, endExclusive: Date): number {
  return events.reduce((total, event) => {
    if (!isActivityEvent(event)) {
      return total;
    }

    const date = eventLocalDate(event);
    if (!date || !isInLocalRange(date, start, endExclusive)) {
      return total;
    }

    return total + event.amount;
  }, 0);
}

export function getTodayActivity(events: readonly CounterEvent[], referenceDate: Date): number {
  const start = startOfLocalDay(referenceDate);
  return sumActivity(events, start, addLocalDays(start, 1));
}

export function getWeekActivity(events: readonly CounterEvent[], referenceDate: Date): number {
  const start = startOfLocalWeekMonday(referenceDate);
  return sumActivity(events, start, addLocalDays(start, 7));
}

export function getMonthActivity(events: readonly CounterEvent[], referenceDate: Date): number {
  const start = startOfLocalMonth(referenceDate);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return sumActivity(events, start, end);
}

export function getDayBuckets(
  events: readonly CounterEvent[],
  referenceDate: Date,
): StatisticBucket[] {
  const dayStart = startOfLocalDay(referenceDate);

  return DAY_BUCKET_HOURS.map((hour) => {
    const start = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), hour);
    const end = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), hour + 4);
    return {
      key: hour.toString().padStart(2, '0'),
      value: sumActivity(events, start, end),
    };
  });
}

export function getWeekBuckets(
  events: readonly CounterEvent[],
  referenceDate: Date,
): StatisticBucket[] {
  const weekStart = startOfLocalWeekMonday(referenceDate);

  return WEEKDAY_KEYS.map((key, index) => {
    const start = addLocalDays(weekStart, index);
    return {
      key,
      value: sumActivity(events, start, addLocalDays(start, 1)),
    };
  });
}

export function getMonthBuckets(
  events: readonly CounterEvent[],
  referenceDate: Date,
): StatisticBucket[] {
  const monthStart = startOfLocalMonth(referenceDate);
  const lastDay = daysInLocalMonth(referenceDate);
  const bucketCount = lastDay <= 28 ? 4 : lastDay <= 35 ? 5 : 6;

  return Array.from({ length: bucketCount }, (_, index) => {
    const startDay = index * 7 + 1;
    const endDay = Math.min(startDay + 7, lastDay + 1);
    const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), startDay);
    const end = new Date(monthStart.getFullYear(), monthStart.getMonth(), endDay);
    return {
      key: `w${index + 1}`,
      value: sumActivity(events, start, end),
    };
  });
}

export function getYearBuckets(
  events: readonly CounterEvent[],
  referenceDate: Date,
): StatisticBucket[] {
  const yearStart = startOfLocalYear(referenceDate);

  return MONTH_KEYS.map((key, month) => {
    const start = new Date(yearStart.getFullYear(), month, 1);
    const end = new Date(yearStart.getFullYear(), month + 1, 1);
    return {
      key,
      value: sumActivity(events, start, end),
    };
  });
}
