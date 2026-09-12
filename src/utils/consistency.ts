import type { CounterEvent } from '@/state/types';
import {
  addLocalDays,
  getLocalDateKey,
  isSameLocalDay,
  localDateFromKey,
  parseTimestamp,
  startOfLocalDay,
  startOfLocalWeekMonday,
} from '@/utils/date';

export const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type WeekDayState =
  | 'active'
  | 'inactivePast'
  | 'todayActive'
  | 'todayPending'
  | 'future';

export type WeekConsistencyDay = {
  key: string;
  weekday: WeekdayKey;
  date: Date;
  state: WeekDayState;
};

export type ConsistencySummary = {
  currentStreak: number;
  bestStreak: number;
  activeDaysThisWeek: number;
  weekDays: WeekConsistencyDay[];
};

function isQualifyingEvent(event: CounterEvent): boolean {
  return event.type === 'increment' || event.type === 'decrement';
}

export function getActiveLocalDays(events: readonly CounterEvent[]): Set<string> {
  const days = new Set<string>();

  for (const event of events) {
    if (!isQualifyingEvent(event)) {
      continue;
    }

    const date = parseTimestamp(event.createdAt);
    if (!date) {
      continue;
    }

    days.add(getLocalDateKey(date));
  }

  return days;
}

export function getCurrentStreak(
  events: readonly CounterEvent[],
  referenceDate: Date,
): number {
  const activeDays = getActiveLocalDays(events);
  const today = startOfLocalDay(referenceDate);
  const yesterday = addLocalDays(today, -1);

  let cursor: Date;
  if (activeDays.has(getLocalDateKey(today))) {
    cursor = today;
  } else if (activeDays.has(getLocalDateKey(yesterday))) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (activeDays.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
}

export function getBestStreak(events: readonly CounterEvent[]): number {
  const dates = [...getActiveLocalDays(events)]
    .map(localDateFromKey)
    .filter((date): date is Date => date !== null)
    .sort((left, right) => left.getTime() - right.getTime());

  if (dates.length === 0) {
    return 0;
  }

  let best = 1;
  let current = 1;

  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1];
    const next = dates[index];
    if (!previous || !next) {
      continue;
    }

    const expectedNext = addLocalDays(previous, 1);
    if (isSameLocalDay(next, expectedNext)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

export function getCurrentWeekConsistency(
  events: readonly CounterEvent[],
  referenceDate: Date,
): WeekConsistencyDay[] {
  const activeDays = getActiveLocalDays(events);
  const weekStart = startOfLocalWeekMonday(referenceDate);
  const today = startOfLocalDay(referenceDate);

  return WEEKDAY_KEYS.map((weekday, index) => {
    const date = addLocalDays(weekStart, index);
    const key = getLocalDateKey(date);
    const isToday = isSameLocalDay(date, today);
    const isFuture = date.getTime() > today.getTime();
    const isActive = activeDays.has(key);

    let state: WeekDayState;
    if (isToday) {
      state = isActive ? 'todayActive' : 'todayPending';
    } else if (isFuture) {
      state = 'future';
    } else {
      state = isActive ? 'active' : 'inactivePast';
    }

    return {
      key,
      weekday,
      date,
      state,
    };
  });
}

export function getActiveDaysThisWeek(
  events: readonly CounterEvent[],
  referenceDate: Date,
): number {
  return getCurrentWeekConsistency(events, referenceDate).filter(
    (day) => day.state === 'active' || day.state === 'todayActive',
  ).length;
}

export function getConsistencySummary(
  events: readonly CounterEvent[],
  referenceDate: Date,
): ConsistencySummary {
  return {
    currentStreak: getCurrentStreak(events, referenceDate),
    bestStreak: getBestStreak(events),
    activeDaysThisWeek: getActiveDaysThisWeek(events, referenceDate),
    weekDays: getCurrentWeekConsistency(events, referenceDate),
  };
}
