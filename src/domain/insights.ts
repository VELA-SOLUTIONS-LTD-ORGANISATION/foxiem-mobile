import {
  averagePerDay,
  comparePeriods,
  completedPeriodTotals,
  dailyValues,
  dayCells,
  reachPace,
  trackerStartDay,
  type Comparison,
  type Context,
  type PaceSummary,
} from './analysis';
import { sumActivity } from './events';
import { addDays, daysBetween, dayKey, periodRange, startOfDay } from './periods';
import type { CountEvent, EventsByTracker, Tracker } from './types';

export type InsightTier = 'free' | 'pro';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export type Insight =
  | { kind: 'comparison'; tier: 'free'; trackerId: string; comparison: Comparison }
  | { kind: 'hitRate'; tier: 'free'; trackerId: string; rule: 'target' | 'limit'; success: number; days: number }
  | { kind: 'average'; tier: 'free'; trackerId: string; average: number; days: number }
  | { kind: 'weekday'; tier: 'pro'; trackerId: string; weekday: number; ratio: number }
  | { kind: 'dayPart'; tier: 'pro'; trackerId: string; part: DayPart; share: number }
  | { kind: 'pace'; tier: 'pro'; trackerId: string; pace: PaceSummary }
  | { kind: 'weeks'; tier: 'pro'; trackerId: string; totals: number[] }
  | { kind: 'crossTracker'; tier: 'pro'; driverId: string; subjectId: string; ratio: number; days: number }
  | { kind: 'activeDays'; tier: 'free'; success: number; days: number }
  | { kind: 'targetsThisWeek'; tier: 'free'; count: number };

/** Why a Pro pattern is not shown yet, so the UI can be honest instead of empty. */
export type PatternReadiness = { ready: true } | { ready: false; daysNeeded: number };

export const PATTERN_MIN_DAYS = 21;
export const DAY_PART_MIN_ENTRIES = 20;
export const CROSS_TRACKER_WINDOW_DAYS = 60;
export const CROSS_TRACKER_MIN_GROUP_DAYS = 5;

export function dayPartOf(date: Date): DayPart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'afternoon';
  }
  if (hour >= 17 && hour < 22) {
    return 'evening';
  }
  return 'night';
}

export function patternReadiness(
  tracker: Tracker,
  events: readonly CountEvent[],
  context: Context,
): PatternReadiness {
  const age = daysBetween(trackerStartDay(tracker, events), context.now) + 1;
  return age >= PATTERN_MIN_DAYS ? { ready: true } : { ready: false, daysNeeded: PATTERN_MIN_DAYS - age };
}

function hitRateInsight(tracker: Tracker, events: readonly CountEvent[], context: Context): Insight | null {
  if (tracker.period !== 'day' || !tracker.target || (tracker.intent !== 'reach' && tracker.intent !== 'limit')) {
    return null;
  }
  const today = startOfDay(context.now);
  const cells = dayCells(tracker, events, addDays(today, -7), addDays(today, -1), context).filter(
    (cell) => cell.outcome === 'success' || cell.outcome === 'miss',
  );
  if (cells.length < 7) {
    return null;
  }
  const success = cells.filter((cell) => cell.outcome === 'success').length;
  return {
    kind: 'hitRate',
    tier: 'free',
    trackerId: tracker.id,
    rule: tracker.intent === 'reach' ? 'target' : 'limit',
    success,
    days: cells.length,
  };
}

function weekdayInsight(tracker: Tracker, events: readonly CountEvent[], context: Context): Insight | null {
  if (!patternReadiness(tracker, events, context).ready) {
    return null;
  }
  const today = startOfDay(context.now);
  const startDay = trackerStartDay(tracker, events);
  const from = new Date(Math.max(startDay.getTime(), addDays(today, -56).getTime()));
  const to = addDays(today, -1);
  const values = dailyValues(events, from, to);
  const sums = new Array<number>(7).fill(0);
  const counts = new Array<number>(7).fill(0);
  let total = 0;
  let days = 0;
  let active = 0;
  for (let cursor = startOfDay(from); cursor.getTime() <= to.getTime(); cursor = addDays(cursor, 1)) {
    const value = Math.max(0, values.get(dayKey(cursor)) ?? 0);
    const weekday = cursor.getDay();
    sums[weekday]! += value;
    counts[weekday]! += 1;
    total += value;
    days += 1;
    if (value > 0) {
      active += 1;
    }
  }
  if (days < 14 || active < 8 || total <= 0 || counts.some((count) => count < 2)) {
    return null;
  }
  const overall = total / days;
  let bestDay = 0;
  let bestAverage = -1;
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const average = sums[weekday]! / counts[weekday]!;
    if (average > bestAverage) {
      bestAverage = average;
      bestDay = weekday;
    }
  }
  const ratio = bestAverage / overall;
  if (ratio < 1.25) {
    return null;
  }
  return { kind: 'weekday', tier: 'pro', trackerId: tracker.id, weekday: bestDay, ratio };
}

function dayPartInsight(tracker: Tracker, events: readonly CountEvent[], context: Context): Insight | null {
  const since = addDays(startOfDay(context.now), -60).getTime();
  const counts: Record<DayPart, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let total = 0;
  for (const event of events) {
    if (event.type !== 'increment') {
      continue;
    }
    const at = Date.parse(event.createdAt);
    if (at < since) {
      continue;
    }
    counts[dayPartOf(new Date(at))] += 1;
    total += 1;
  }
  if (total < DAY_PART_MIN_ENTRIES) {
    return null;
  }
  const [part, count] = (Object.entries(counts) as [DayPart, number][]).reduce((best, entry) =>
    entry[1] > best[1] ? entry : best,
  );
  const share = count / total;
  return share >= 0.5 ? { kind: 'dayPart', tier: 'pro', trackerId: tracker.id, part, share } : null;
}

function weeksInsight(tracker: Tracker, events: readonly CountEvent[], context: Context): Insight | null {
  const weeks = completedPeriodTotals(tracker, events, 'week', 4, context);
  if (weeks.some((week) => !week.existed) || weeks.every((week) => week.total === 0)) {
    return null;
  }
  return { kind: 'weeks', tier: 'pro', trackerId: tracker.id, totals: weeks.map((week) => week.total) };
}

/** Deterministic, explainable insights for one tracker, most useful first. */
export function trackerInsights(
  tracker: Tracker,
  events: readonly CountEvent[],
  context: Context,
): Insight[] {
  const insights: Insight[] = [];

  if (tracker.intent !== 'consistency') {
    const comparison = comparePeriods(tracker, events, context);
    if (comparison && (comparison.current > 0 || comparison.previous > 0)) {
      insights.push({ kind: 'comparison', tier: 'free', trackerId: tracker.id, comparison });
    }
  }

  const hitRate = hitRateInsight(tracker, events, context);
  if (hitRate) {
    insights.push(hitRate);
  }

  if (tracker.intent === 'count' || tracker.intent === 'reach') {
    const average = averagePerDay(tracker, events, context);
    if (average && average.average > 0) {
      insights.push({ kind: 'average', tier: 'free', trackerId: tracker.id, ...average });
    }
  }

  const pace = reachPace(tracker, events, context);
  if (pace && !(pace.kind === 'period' && pace.status === 'done')) {
    insights.push({ kind: 'pace', tier: 'pro', trackerId: tracker.id, pace });
  }

  const weekday = weekdayInsight(tracker, events, context);
  if (weekday) {
    insights.push(weekday);
  }

  const dayPart = dayPartInsight(tracker, events, context);
  if (dayPart) {
    insights.push(dayPart);
  }

  const weeks = weeksInsight(tracker, events, context);
  if (weeks) {
    insights.push(weeks);
  }

  return insights;
}

function crossTrackerInsights(
  trackers: readonly Tracker[],
  eventsByTracker: EventsByTracker,
  context: Context,
): Insight[] {
  const today = startOfDay(context.now);
  const windowStart = addDays(today, -CROSS_TRACKER_WINDOW_DAYS);
  const yesterday = addDays(today, -1);
  const series = trackers.map((tracker) => {
    const events = eventsByTracker[tracker.id] ?? [];
    const startDay = trackerStartDay(tracker, events);
    return { tracker, startDay, values: dailyValues(events, windowStart, yesterday) };
  });
  const trackedDays = new Set<string>();
  for (const item of series) {
    item.values.forEach((value, key) => {
      if (value > 0) {
        trackedDays.add(key);
      }
    });
  }

  const found: Insight[] = [];
  for (const driver of series) {
    for (const subject of series) {
      if (driver.tracker.id === subject.tracker.id || subject.tracker.intent === 'consistency') {
        continue;
      }
      const from = new Date(Math.max(windowStart.getTime(), driver.startDay.getTime(), subject.startDay.getTime()));
      const withDriver: number[] = [];
      const withoutDriver: number[] = [];
      let subjectActive = 0;
      for (let cursor = from; cursor.getTime() <= yesterday.getTime(); cursor = addDays(cursor, 1)) {
        const key = dayKey(cursor);
        // A day with nothing logged anywhere says more about app use than about behaviour.
        if (!trackedDays.has(key)) {
          continue;
        }
        const subjectValue = Math.max(0, subject.values.get(key) ?? 0);
        const driverActive = (driver.values.get(key) ?? 0) > 0;
        if (subjectValue > 0) {
          subjectActive += 1;
        }
        if (driverActive) {
          withDriver.push(subjectValue);
        } else {
          withoutDriver.push(subjectValue);
        }
      }
      if (
        withDriver.length < CROSS_TRACKER_MIN_GROUP_DAYS ||
        withoutDriver.length < CROSS_TRACKER_MIN_GROUP_DAYS ||
        subjectActive < 10
      ) {
        continue;
      }
      const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
      const baseline = mean(withoutDriver);
      if (baseline <= 0) {
        continue;
      }
      const ratio = mean(withDriver) / baseline - 1;
      if (Math.abs(ratio) >= 0.2) {
        found.push({
          kind: 'crossTracker',
          tier: 'pro',
          driverId: driver.tracker.id,
          subjectId: subject.tracker.id,
          ratio,
          days: withDriver.length + withoutDriver.length,
        });
      }
    }
  }
  return found.sort((left, right) =>
    left.kind === 'crossTracker' && right.kind === 'crossTracker'
      ? Math.abs(right.ratio) - Math.abs(left.ratio)
      : 0,
  ).slice(0, 3);
}

function targetsReachedThisWeek(
  trackers: readonly Tracker[],
  eventsByTracker: EventsByTracker,
  context: Context,
): number {
  const week = periodRange('week', context.now, context.weekStart);
  let count = 0;
  for (const tracker of trackers) {
    const events = eventsByTracker[tracker.id] ?? [];
    if (tracker.intent === 'reach' && tracker.target) {
      if (tracker.period === 'day') {
        count += dayCells(tracker, events, week.start, addDays(week.end, -1), context).filter(
          (cell) => cell.outcome === 'success',
        ).length;
      } else if (tracker.period === 'week' && sumActivity(events, week.start, week.end) >= tracker.target) {
        count += 1;
      }
    }
    if (tracker.intent === 'consistency') {
      const cells = dayCells(tracker, events, week.start, addDays(week.end, -1), context);
      if (cells.filter((cell) => cell.value > 0).length >= (tracker.target ?? 7)) {
        count += 1;
      }
    }
  }
  return count;
}

/** Cross-tracker view for the Insights tab. */
export function globalInsights(
  trackers: readonly Tracker[],
  eventsByTracker: EventsByTracker,
  context: Context,
): Insight[] {
  const insights: Insight[] = [];
  if (trackers.length === 0) {
    return insights;
  }
  const today = startOfDay(context.now);
  const earliest = trackers.reduce(
    (min, tracker) => Math.min(min, trackerStartDay(tracker, eventsByTracker[tracker.id] ?? []).getTime()),
    Number.POSITIVE_INFINITY,
  );
  const age = daysBetween(new Date(earliest), today) + 1;
  if (age >= 7) {
    const active = new Set<string>();
    for (const tracker of trackers) {
      dailyValues(eventsByTracker[tracker.id] ?? [], addDays(today, -6), today).forEach((value, key) => {
        if (value > 0) {
          active.add(key);
        }
      });
    }
    insights.push({ kind: 'activeDays', tier: 'free', success: active.size, days: 7 });
  }

  const targets = targetsReachedThisWeek(trackers, eventsByTracker, context);
  if (targets > 0) {
    insights.push({ kind: 'targetsThisWeek', tier: 'free', count: targets });
  }

  insights.push(...crossTrackerInsights(trackers, eventsByTracker, context));
  return insights;
}
