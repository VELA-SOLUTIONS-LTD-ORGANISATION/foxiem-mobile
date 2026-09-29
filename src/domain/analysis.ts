import { currentPeriodValue, runningValue, sumActivity } from './events';
import {
  addDays,
  dayKey,
  daysBetween,
  daysLeftInPeriod,
  elapsedFraction,
  parseInstant,
  periodRange,
  previousComparableWindow,
  shiftedPeriodRange,
  startOfDay,
  type DateRange,
} from './periods';
import type { CountEvent, Tracker, TrackerPeriod, WeekStart } from './types';

export type Context = {
  now: Date;
  weekStart: WeekStart;
};

type RangedPeriod = Exclude<TrackerPeriod, 'all'>;

export const CONSISTENCY_WINDOW_DAYS = 30;
export const MIN_CONSISTENCY_DAYS = 3;

export function trackerStartDay(tracker: Tracker, events: readonly CountEvent[]): Date {
  const created = parseInstant(tracker.createdAt) ?? new Date();
  const first = events[0] ? parseInstant(events[0].createdAt) : null;
  const earliest = first && first.getTime() < created.getTime() ? first : created;
  return startOfDay(earliest);
}

/** Net activity per local day from `from` to `to` inclusive. */
export function dailyValues(
  events: readonly CountEvent[],
  from: Date,
  toInclusive: Date,
): Map<string, number> {
  const values = new Map<string, number>();
  const start = startOfDay(from).getTime();
  const end = addDays(startOfDay(toInclusive), 1).getTime();
  for (const event of events) {
    if (event.type !== 'increment' && event.type !== 'decrement') {
      continue;
    }
    const at = Date.parse(event.createdAt);
    if (at < start || at >= end) {
      continue;
    }
    const key = dayKey(new Date(at));
    values.set(key, (values.get(key) ?? 0) + event.amount);
  }
  return values;
}

export type DayOutcome = 'success' | 'miss' | 'pending' | 'before' | 'future';

export type DayCell = {
  key: string;
  date: Date;
  value: number;
  outcome: DayOutcome;
  isToday: boolean;
};

function usesDailyGoal(tracker: Tracker): boolean {
  return tracker.period === 'day' && (tracker.intent === 'reach' || tracker.intent === 'limit');
}

/** How one day reads for this tracker's intent. */
export function dayOutcome(
  tracker: Tracker,
  value: number,
  date: Date,
  context: Context & { startDay: Date },
): DayOutcome {
  const day = startOfDay(date);
  const today = startOfDay(context.now);
  if (day.getTime() > today.getTime()) {
    return 'future';
  }
  if (day.getTime() < context.startDay.getTime()) {
    return 'before';
  }
  const isToday = day.getTime() === today.getTime();

  if (usesDailyGoal(tracker) && tracker.target) {
    if (tracker.intent === 'reach') {
      if (value >= tracker.target) {
        return 'success';
      }
      return isToday ? 'pending' : 'miss';
    }
    if (value > tracker.target) {
      return 'miss';
    }
    return isToday ? 'pending' : 'success';
  }

  if (value > 0) {
    return 'success';
  }
  return isToday ? 'pending' : 'miss';
}

export function dayCells(
  tracker: Tracker,
  events: readonly CountEvent[],
  from: Date,
  toInclusive: Date,
  context: Context,
): DayCell[] {
  const values = dailyValues(events, from, toInclusive);
  const startDay = trackerStartDay(tracker, events);
  const cells: DayCell[] = [];
  const todayKey = dayKey(context.now);
  let cursor = startOfDay(from);
  const last = startOfDay(toInclusive).getTime();
  while (cursor.getTime() <= last) {
    const key = dayKey(cursor);
    const value = values.get(key) ?? 0;
    cells.push({
      key,
      date: cursor,
      value,
      outcome: dayOutcome(tracker, value, cursor, { ...context, startDay }),
      isToday: key === todayKey,
    });
    cursor = addDays(cursor, 1);
  }
  return cells;
}

export type PeriodTotal = DateRange & {
  total: number;
  /** The tracker existed for the whole period. */
  existed: boolean;
};

/** The last `count` complete periods, oldest first. */
export function completedPeriodTotals(
  tracker: Tracker,
  events: readonly CountEvent[],
  period: RangedPeriod,
  count: number,
  context: Context,
): PeriodTotal[] {
  const startDay = trackerStartDay(tracker, events);
  const totals: PeriodTotal[] = [];
  for (let offset = -count; offset <= -1; offset += 1) {
    const range = shiftedPeriodRange(period, context.now, offset, context.weekStart);
    totals.push({
      ...range,
      total: sumActivity(events, range.start, range.end),
      existed: startDay.getTime() <= range.start.getTime(),
    });
  }
  return totals;
}

export type Comparison = {
  period: RangedPeriod;
  current: number;
  previous: number;
  /** (current - previous) / previous; null when previous is 0. */
  ratio: number | null;
  direction: 'up' | 'down' | 'same';
};

export function comparisonPeriod(tracker: Tracker): RangedPeriod {
  return tracker.period === 'all' ? 'month' : tracker.period;
}

/**
 * This period so far vs the same point in the previous period.
 * Null when the tracker did not exist for the whole comparison window.
 */
export function comparePeriods(
  tracker: Tracker,
  events: readonly CountEvent[],
  context: Context,
): Comparison | null {
  const period = comparisonPeriod(tracker);
  const window = previousComparableWindow(period, context.now, context.weekStart);
  const startDay = trackerStartDay(tracker, events);
  if (startDay.getTime() > window.start.getTime()) {
    return null;
  }
  const currentRange = periodRange(period, context.now, context.weekStart);
  const current = Math.max(0, sumActivity(events, currentRange.start, new Date(context.now.getTime() + 1)));
  const previous = Math.max(0, sumActivity(events, window.start, new Date(window.end.getTime() + 1)));
  if (previous === 0) {
    return { period, current, previous, ratio: null, direction: current === 0 ? 'same' : 'up' };
  }
  const ratio = (current - previous) / previous;
  const direction = Math.abs(ratio) < 0.03 ? 'same' : ratio > 0 ? 'up' : 'down';
  return { period, current, previous, ratio, direction };
}

export type ConsistencySummary =
  | {
      kind: 'days';
      rule: 'active' | 'target' | 'limit' | 'rhythm';
      success: number;
      evaluated: number;
      planned: number;
      rate: number;
    }
  | {
      kind: 'periods';
      rule: 'target' | 'limit';
      period: 'week' | 'month';
      success: number;
      evaluated: number;
      rate: number;
    }
  | { kind: 'insufficient'; daysNeeded: number };

function evaluatePeriodGoal(
  tracker: Tracker,
  total: number,
  isCurrent: boolean,
): 'success' | 'miss' | 'pending' {
  const target = tracker.target ?? 0;
  if (tracker.intent === 'reach') {
    if (total >= target) {
      return 'success';
    }
    return isCurrent ? 'pending' : 'miss';
  }
  if (total > target) {
    return 'miss';
  }
  return isCurrent ? 'pending' : 'success';
}

/** Recent consistency, never counting days before the tracker existed. Null for Reduce. */
export function consistencySummary(
  tracker: Tracker,
  events: readonly CountEvent[],
  context: Context,
): ConsistencySummary | null {
  if (tracker.intent === 'reduce') {
    return null;
  }

  const periodGoal =
    (tracker.intent === 'reach' || tracker.intent === 'limit') &&
    (tracker.period === 'week' || tracker.period === 'month') &&
    tracker.target;

  if (periodGoal) {
    const period = tracker.period as 'week' | 'month';
    const lookback = period === 'week' ? 8 : 6;
    const startDay = trackerStartDay(tracker, events);
    let success = 0;
    let evaluated = 0;
    for (let offset = -(lookback - 1); offset <= 0; offset += 1) {
      const range = shiftedPeriodRange(period, context.now, offset, context.weekStart);
      if (startDay.getTime() > range.start.getTime()) {
        continue;
      }
      const outcome = evaluatePeriodGoal(tracker, sumActivity(events, range.start, range.end), offset === 0);
      if (outcome === 'pending') {
        continue;
      }
      evaluated += 1;
      if (outcome === 'success') {
        success += 1;
      }
    }
    if (evaluated < 1) {
      return { kind: 'insufficient', daysNeeded: daysBetween(context.now, shiftedPeriodRange(period, context.now, 1, context.weekStart).start) };
    }
    return { kind: 'periods', rule: tracker.intent === 'reach' ? 'target' : 'limit', period, success, evaluated, rate: success / evaluated };
  }

  const today = startOfDay(context.now);
  const windowStart = addDays(today, -(CONSISTENCY_WINDOW_DAYS - 1));
  const cells = dayCells(tracker, events, windowStart, today, context);
  const counted = cells.filter((cell) => cell.outcome === 'success' || cell.outcome === 'miss');
  const success = counted.filter((cell) => cell.outcome === 'success').length;
  const evaluated = counted.length;

  if (evaluated < MIN_CONSISTENCY_DAYS) {
    return { kind: 'insufficient', daysNeeded: MIN_CONSISTENCY_DAYS - evaluated };
  }

  const rule: 'active' | 'target' | 'limit' | 'rhythm' = usesDailyGoal(tracker)
    ? tracker.intent === 'reach'
      ? 'target'
      : 'limit'
    : tracker.intent === 'consistency' && (tracker.target ?? 7) < 7
      ? 'rhythm'
      : 'active';

  const planned =
    rule === 'rhythm' ? Math.max(1, Math.round(((tracker.target ?? 7) * evaluated) / 7)) : evaluated;
  return { kind: 'days', rule, success, evaluated, planned, rate: Math.min(1, success / planned) };
}

export type StreakSummary = {
  unit: 'day' | 'week' | 'month';
  current: number;
  best: number;
};

function periodSucceeded(
  tracker: Tracker,
  events: readonly CountEvent[],
  range: DateRange,
  isCurrent: boolean,
): 'success' | 'miss' | 'pending' {
  const total = sumActivity(events, range.start, range.end);
  if (tracker.intent === 'consistency') {
    const days = dailyValues(events, range.start, addDays(range.end, -1));
    let active = 0;
    days.forEach((value) => {
      if (value > 0) {
        active += 1;
      }
    });
    if (active >= (tracker.target ?? 7)) {
      return 'success';
    }
    return isCurrent ? 'pending' : 'miss';
  }
  return evaluatePeriodGoal(tracker, total, isCurrent);
}

/** Current and best streak. Null when streaks do not fit the intent (Reduce). */
export function streakSummary(
  tracker: Tracker,
  events: readonly CountEvent[],
  context: Context,
): StreakSummary | null {
  if (tracker.intent === 'reduce') {
    return null;
  }
  const startDay = trackerStartDay(tracker, events);
  const today = startOfDay(context.now);

  const weekly =
    (tracker.intent === 'consistency' && (tracker.target ?? 7) < 7) ||
    ((tracker.intent === 'reach' || tracker.intent === 'limit') && tracker.period === 'week');
  const monthly =
    (tracker.intent === 'reach' || tracker.intent === 'limit') && tracker.period === 'month';

  if (weekly || monthly) {
    const period = weekly ? 'week' : 'month';
    const outcomes: ('success' | 'miss' | 'pending')[] = [];
    for (let offset = 0; ; offset -= 1) {
      const range = shiftedPeriodRange(period, context.now, offset, context.weekStart);
      if (range.end.getTime() <= startDay.getTime()) {
        break;
      }
      outcomes.push(periodSucceeded(tracker, events, range, offset === 0));
      if (outcomes.length > 520) {
        break;
      }
    }
    return { unit: period, ...streaksFromOutcomes(outcomes) };
  }

  const cells = dayCells(tracker, events, startDay, today, context).reverse();
  return { unit: 'day', ...streaksFromOutcomes(cells.map((cell) => (cell.outcome === 'before' || cell.outcome === 'future' ? 'miss' : cell.outcome))) };
}

/** `outcomes` newest first. A pending newest item neither extends nor breaks the streak. */
function streaksFromOutcomes(outcomes: readonly ('success' | 'miss' | 'pending')[]): {
  current: number;
  best: number;
} {
  let current = 0;
  let index = 0;
  if (outcomes[0] === 'pending') {
    index = 1;
  }
  while (index < outcomes.length && outcomes[index] === 'success') {
    current += 1;
    index += 1;
  }
  let best = 0;
  let run = 0;
  for (const outcome of outcomes) {
    if (outcome === 'success') {
      run += 1;
      best = Math.max(best, run);
    } else if (outcome === 'miss') {
      run = 0;
    }
  }
  return { current, best: Math.max(best, current) };
}

export type PaceSummary =
  | {
      kind: 'period';
      status: 'ahead' | 'onPace' | 'behind' | 'done';
      expected: number;
      behindBy: number;
      projected: number | null;
      perDayNeeded: number | null;
      daysLeft: number;
    }
  | {
      kind: 'total';
      averagePerDay: number;
      eta: Date | null;
      remaining: number;
    };

/** Reach pace for weekly/monthly/all-time targets. Daily targets only need "remaining". */
export function reachPace(
  tracker: Tracker,
  events: readonly CountEvent[],
  context: Context,
): PaceSummary | null {
  if (tracker.intent !== 'reach' || !tracker.target || tracker.period === 'day') {
    return null;
  }
  const value = currentPeriodValue(tracker, events, context.now, context.weekStart);

  if (tracker.period === 'all') {
    const remaining = Math.max(0, tracker.target - value);
    const startDay = trackerStartDay(tracker, events);
    const today = startOfDay(context.now);
    const age = daysBetween(startDay, today) + 1;
    if (age < 7) {
      return null;
    }
    const span = Math.min(14, age);
    const from = addDays(today, -(span - 1));
    const recent = sumActivity(events, from, addDays(today, 1));
    const averagePerDay = recent / span;
    const eta =
      remaining === 0 || averagePerDay <= 0
        ? null
        : addDays(today, Math.ceil(remaining / averagePerDay));
    return { kind: 'total', averagePerDay, eta, remaining };
  }

  const fraction = elapsedFraction(tracker.period, context.now, context.weekStart);
  const expected = tracker.target * fraction;
  const daysLeft = daysLeftInPeriod(tracker.period, context.now, context.weekStart);
  if (value >= tracker.target) {
    return { kind: 'period', status: 'done', expected, behindBy: 0, projected: null, perDayNeeded: null, daysLeft };
  }
  const status = value >= expected * 1.1 && value > 0 ? 'ahead' : value < expected * 0.9 ? 'behind' : 'onPace';
  const projected = fraction >= 0.15 ? Math.round(value / fraction) : null;
  return {
    kind: 'period',
    status,
    expected,
    behindBy: Math.max(0, Math.ceil(expected - value)),
    projected,
    perDayNeeded: Math.ceil((tracker.target - value) / daysLeft),
    daysLeft,
  };
}

export type TrackerState =
  | 'empty'
  | 'counting'
  | 'toGo'
  | 'reached'
  | 'underLimit'
  | 'atLimit'
  | 'overLimit'
  | 'trend'
  | 'rhythm';

/** Everything Home and Tracker Detail need to present one tracker. */
export type TrackerSnapshot = {
  hero: number;
  running: number;
  periodValue: number;
  today: number;
  thisMonth: number;
  progress: number | null;
  remaining: number | null;
  over: number | null;
  state: TrackerState;
  comparison: Comparison | null;
  week: DayCell[];
  activeDaysThisWeek: number;
  lastEventAt: Date | null;
  hasEvents: boolean;
};

export function trackerSnapshot(
  tracker: Tracker,
  events: readonly CountEvent[],
  context: Context,
): TrackerSnapshot {
  const periodValue = currentPeriodValue(tracker, events, context.now, context.weekStart);
  const running = runningValue(tracker, events);
  const todayRange = periodRange('day', context.now, context.weekStart);
  const monthRange = periodRange('month', context.now, context.weekStart);
  const weekRange = periodRange('week', context.now, context.weekStart);
  const week = dayCells(tracker, events, weekRange.start, addDays(weekRange.end, -1), context);
  const activeDaysThisWeek = week.filter((cell) => cell.value > 0).length;
  const last = events[events.length - 1];
  const target = tracker.target;

  let hero = periodValue;
  let progress: number | null = null;
  let remaining: number | null = null;
  let over: number | null = null;
  let state: TrackerState = 'counting';

  switch (tracker.intent) {
    case 'reach':
      if (target) {
        progress = Math.min(1, periodValue / target);
        remaining = Math.max(0, target - periodValue);
        state = periodValue >= target ? 'reached' : 'toGo';
      }
      break;
    case 'limit':
      if (target) {
        progress = Math.min(1, periodValue / target);
        remaining = Math.max(0, target - periodValue);
        over = periodValue > target ? periodValue - target : null;
        state = periodValue > target ? 'overLimit' : periodValue === target ? 'atLimit' : 'underLimit';
      }
      break;
    case 'reduce':
      state = 'trend';
      break;
    case 'consistency':
      hero = activeDaysThisWeek;
      progress = Math.min(1, activeDaysThisWeek / (target ?? 7));
      remaining = Math.max(0, (target ?? 7) - activeDaysThisWeek);
      state = activeDaysThisWeek >= (target ?? 7) ? 'reached' : 'rhythm';
      break;
    default:
      state = 'counting';
  }

  if (events.length === 0 && tracker.intent !== 'limit' && tracker.intent !== 'reach') {
    state = tracker.intent === 'consistency' ? 'rhythm' : 'empty';
  }

  return {
    hero,
    running,
    periodValue,
    today: Math.max(0, sumActivity(events, todayRange.start, todayRange.end)),
    thisMonth: Math.max(0, sumActivity(events, monthRange.start, monthRange.end)),
    progress,
    remaining,
    over,
    state,
    comparison:
      tracker.intent === 'reduce' || tracker.intent === 'count' || tracker.intent === 'limit'
        ? comparePeriods(tracker, events, context)
        : null,
    week,
    activeDaysThisWeek,
    lastEventAt: last ? parseInstant(last.createdAt) : null,
    hasEvents: events.length > 0,
  };
}

/** Average per day over the last `days` days, never before the tracker existed. */
export function averagePerDay(
  tracker: Tracker,
  events: readonly CountEvent[],
  context: Context,
  days = 30,
): { average: number; days: number } | null {
  const today = startOfDay(context.now);
  const startDay = trackerStartDay(tracker, events);
  const span = Math.min(days, daysBetween(startDay, today) + 1);
  if (span < 7) {
    return null;
  }
  const from = addDays(today, -(span - 1));
  const total = sumActivity(events, from, addDays(today, 1));
  return { average: total / span, days: span };
}
