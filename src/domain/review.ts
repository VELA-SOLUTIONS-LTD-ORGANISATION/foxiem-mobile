import { dailyValues, dayCells, trackerStartDay, type Context } from './analysis';
import { sumActivity } from './events';
import {
  addDays,
  daysBetween,
  daysLeftInPeriod,
  dayKey,
  periodRange,
  shiftedPeriodRange,
  startOfWeek,
  type DateRange,
} from './periods';
import type { CountEvent, EventsByTracker, Tracker } from './types';

export type ReviewLine =
  | { trackerId: string; kind: 'dailyTarget'; success: number; days: number; total: number }
  | { trackerId: string; kind: 'dailyLimit'; success: number; days: number; total: number }
  | { trackerId: string; kind: 'periodTarget'; total: number; target: number; met: boolean }
  | { trackerId: string; kind: 'periodLimit'; total: number; limit: number; met: boolean }
  | { trackerId: string; kind: 'rhythm'; activeDays: number; target: number; met: boolean }
  | { trackerId: string; kind: 'change'; total: number; previous: number; ratio: number | null };

export type WeeklyReview = {
  range: DateRange;
  available: boolean;
  targetsReached: number;
  activeDays: number;
  lines: ReviewLine[];
  pattern: { trackerId: string; weekdays: number[] } | null;
  next: { trackerId: string; perDay: number; remaining: number } | null;
};

export type MonthlyLine = {
  trackerId: string;
  total: number;
  previous: number | null;
  ratio: number | null;
  direction: 'up' | 'down' | 'steady' | null;
  bestWeek: { start: Date; total: number } | null;
  successRate: { success: number; days: number; rule: 'target' | 'limit' } | null;
};

export type MonthlyReview = {
  range: DateRange;
  available: boolean;
  activeDays: number;
  days: number;
  targetsReached: number;
  lines: MonthlyLine[];
};

function changeRatio(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

function existedFor(tracker: Tracker, events: readonly CountEvent[], range: DateRange): boolean {
  return trackerStartDay(tracker, events).getTime() <= range.start.getTime();
}

function startedBefore(tracker: Tracker, events: readonly CountEvent[], range: DateRange): boolean {
  return trackerStartDay(tracker, events).getTime() < range.end.getTime();
}

function weekLine(
  tracker: Tracker,
  events: readonly CountEvent[],
  range: DateRange,
  previousRange: DateRange,
  context: Context,
): ReviewLine | null {
  const total = Math.max(0, sumActivity(events, range.start, range.end));
  const lastDay = addDays(range.end, -1);
  // Evaluate from just after the period so its last day counts as complete.
  const reviewContext = { ...context, now: range.end };

  if ((tracker.intent === 'reach' || tracker.intent === 'limit') && tracker.target) {
    if (tracker.period === 'day') {
      const cells = dayCells(tracker, events, range.start, lastDay, reviewContext).filter(
        (cell) => cell.outcome === 'success' || cell.outcome === 'miss',
      );
      const success = cells.filter((cell) => cell.outcome === 'success').length;
      return tracker.intent === 'reach'
        ? { trackerId: tracker.id, kind: 'dailyTarget', success, days: cells.length, total }
        : { trackerId: tracker.id, kind: 'dailyLimit', success, days: cells.length, total };
    }
    if (tracker.period === 'week') {
      return tracker.intent === 'reach'
        ? { trackerId: tracker.id, kind: 'periodTarget', total, target: tracker.target, met: total >= tracker.target }
        : { trackerId: tracker.id, kind: 'periodLimit', total, limit: tracker.target, met: total <= tracker.target };
    }
  }

  if (tracker.intent === 'consistency') {
    let activeDays = 0;
    dailyValues(events, range.start, lastDay).forEach((value) => {
      if (value > 0) {
        activeDays += 1;
      }
    });
    const target = tracker.target ?? 7;
    return { trackerId: tracker.id, kind: 'rhythm', activeDays, target, met: activeDays >= target };
  }

  const previous = existedFor(tracker, events, previousRange)
    ? Math.max(0, sumActivity(events, previousRange.start, previousRange.end))
    : 0;
  return {
    trackerId: tracker.id,
    kind: 'change',
    total,
    previous,
    ratio: existedFor(tracker, events, previousRange) ? changeRatio(total, previous) : null,
  };
}

function strongestDays(
  events: readonly CountEvent[],
  range: DateRange,
): number[] {
  const values = dailyValues(events, range.start, addDays(range.end, -1));
  const days: { weekday: number; value: number }[] = [];
  for (let cursor = range.start; cursor.getTime() < range.end.getTime(); cursor = addDays(cursor, 1)) {
    days.push({ weekday: cursor.getDay(), value: Math.max(0, values.get(dayKey(cursor)) ?? 0) });
  }
  const active = days.filter((day) => day.value > 0);
  if (active.length < 3) {
    return [];
  }
  const average = days.reduce((sum, day) => sum + day.value, 0) / days.length;
  return [...days]
    .sort((left, right) => right.value - left.value)
    .slice(0, 2)
    .filter((day) => day.value >= average * 1.3)
    .map((day) => day.weekday);
}

/** Review of the last complete week. */
export function weeklyReview(
  trackers: readonly Tracker[],
  eventsByTracker: EventsByTracker,
  context: Context,
): WeeklyReview {
  const range = shiftedPeriodRange('week', context.now, -1, context.weekStart);
  const previousRange = shiftedPeriodRange('week', context.now, -2, context.weekStart);
  const relevant = trackers.filter((tracker) => startedBefore(tracker, eventsByTracker[tracker.id] ?? [], range));
  const available = relevant.some((tracker) => existedFor(tracker, eventsByTracker[tracker.id] ?? [], range));

  const lines: ReviewLine[] = [];
  const activeKeys = new Set<string>();
  let targetsReached = 0;
  let pattern: WeeklyReview['pattern'] = null;
  let patternStrength = 0;

  for (const tracker of relevant) {
    const events = eventsByTracker[tracker.id] ?? [];
    const line = weekLine(tracker, events, range, previousRange, context);
    if (line) {
      lines.push(line);
      if (line.kind === 'dailyTarget') {
        targetsReached += line.success;
      } else if ((line.kind === 'periodTarget' || line.kind === 'rhythm') && line.met) {
        targetsReached += 1;
      }
    }
    dailyValues(events, range.start, addDays(range.end, -1)).forEach((value, key) => {
      if (value > 0) {
        activeKeys.add(key);
      }
    });
    if (tracker.intent === 'reach' || tracker.intent === 'count' || tracker.intent === 'consistency') {
      const weekdays = strongestDays(events, range);
      const total = sumActivity(events, range.start, range.end);
      if (weekdays.length > 0 && total > patternStrength) {
        pattern = { trackerId: tracker.id, weekdays };
        patternStrength = total;
      }
    }
  }

  let next: WeeklyReview['next'] = null;
  for (const tracker of trackers) {
    if (tracker.intent !== 'reach' || !tracker.target || tracker.period !== 'month') {
      continue;
    }
    const events = eventsByTracker[tracker.id] ?? [];
    const month = periodRange('month', context.now, context.weekStart);
    const value = Math.max(0, sumActivity(events, month.start, month.end));
    const remaining = tracker.target - value;
    if (remaining > 0) {
      const daysLeft = daysLeftInPeriod('month', context.now, context.weekStart);
      next = { trackerId: tracker.id, perDay: Math.ceil(remaining / daysLeft), remaining };
      break;
    }
  }

  return { range, available, targetsReached, activeDays: activeKeys.size, lines, pattern, next };
}

/** Review of the last complete month. */
export function monthlyReview(
  trackers: readonly Tracker[],
  eventsByTracker: EventsByTracker,
  context: Context,
): MonthlyReview {
  const range = shiftedPeriodRange('month', context.now, -1, context.weekStart);
  const previousRange = shiftedPeriodRange('month', context.now, -2, context.weekStart);
  const olderRange = shiftedPeriodRange('month', context.now, -3, context.weekStart);
  const relevant = trackers.filter((tracker) => startedBefore(tracker, eventsByTracker[tracker.id] ?? [], range));
  const available = relevant.some((tracker) => existedFor(tracker, eventsByTracker[tracker.id] ?? [], range));
  const days = daysBetween(range.start, range.end);
  const lastDay = addDays(range.end, -1);
  const reviewContext = { ...context, now: range.end };

  const activeKeys = new Set<string>();
  let targetsReached = 0;
  const lines: MonthlyLine[] = relevant.map((tracker) => {
    const events = eventsByTracker[tracker.id] ?? [];
    const total = Math.max(0, sumActivity(events, range.start, range.end));
    const hasPrevious = existedFor(tracker, events, previousRange);
    const previous = hasPrevious ? Math.max(0, sumActivity(events, previousRange.start, previousRange.end)) : null;

    let direction: MonthlyLine['direction'] = null;
    if (existedFor(tracker, events, olderRange) && previous !== null) {
      const older = Math.max(0, sumActivity(events, olderRange.start, olderRange.end));
      const reference = (older + previous) / 2;
      if (reference > 0) {
        const change = (total - reference) / reference;
        direction = change >= 0.1 ? 'up' : change <= -0.1 ? 'down' : 'steady';
      }
    }

    let bestWeek: MonthlyLine['bestWeek'] = null;
    for (
      let weekStart = startOfWeek(range.start, context.weekStart);
      weekStart.getTime() < range.end.getTime();
      weekStart = addDays(weekStart, 7)
    ) {
      const from = new Date(Math.max(weekStart.getTime(), range.start.getTime()));
      const to = new Date(Math.min(addDays(weekStart, 7).getTime(), range.end.getTime()));
      const weekTotal = Math.max(0, sumActivity(events, from, to));
      if (weekTotal > 0 && (!bestWeek || weekTotal > bestWeek.total)) {
        bestWeek = { start: from, total: weekTotal };
      }
    }

    let successRate: MonthlyLine['successRate'] = null;
    if ((tracker.intent === 'reach' || tracker.intent === 'limit') && tracker.period === 'day' && tracker.target) {
      const cells = dayCells(tracker, events, range.start, lastDay, reviewContext).filter(
        (cell) => cell.outcome === 'success' || cell.outcome === 'miss',
      );
      const success = cells.filter((cell) => cell.outcome === 'success').length;
      successRate = { success, days: cells.length, rule: tracker.intent === 'reach' ? 'target' : 'limit' };
      if (tracker.intent === 'reach') {
        targetsReached += success;
      }
    } else if (tracker.intent === 'reach' && tracker.period === 'month' && tracker.target && total >= tracker.target) {
      targetsReached += 1;
    }

    dailyValues(events, range.start, lastDay).forEach((value, key) => {
      if (value > 0) {
        activeKeys.add(key);
      }
    });

    return {
      trackerId: tracker.id,
      total,
      previous,
      ratio: previous === null ? null : changeRatio(total, previous),
      direction,
      bestWeek,
      successRate,
    };
  });

  return { range, available, activeDays: activeKeys.size, days, targetsReached, lines };
}
