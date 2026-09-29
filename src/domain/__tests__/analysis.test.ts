import {
  comparePeriods,
  consistencySummary,
  reachPace,
  streakSummary,
  trackerSnapshot,
} from '../analysis';

import { at, dailyEntries, makeEvents, makeTracker } from './helpers';

const weekStart = 1 as const;

describe('intents drive the snapshot', () => {
  it('Reach — 6 of 8 today, 2 to go, then reached', () => {
    const water = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8 });
    const now = at(2026, 3, 4, 15);
    const events = makeEvents(water, [[at(2026, 3, 4, 9), 6]]);
    const snapshot = trackerSnapshot(water, events, { now, weekStart });
    expect(snapshot).toMatchObject({ hero: 6, remaining: 2, state: 'toGo', progress: 0.75 });

    const done = makeEvents(water, [[at(2026, 3, 4, 9), 8]]);
    expect(trackerSnapshot(water, done, { now, weekStart }).state).toBe('reached');
  });

  it('daily trackers reset automatically without losing yesterday', () => {
    const water = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8 });
    const events = makeEvents(water, [[at(2026, 3, 3, 9), 8]]);
    const today = trackerSnapshot(water, events, { now: at(2026, 3, 4, 7), weekStart });
    expect(today.hero).toBe(0);
    expect(today.running).toBe(8);
    const yesterday = today.week.find((cell) => cell.key === '2026-03-03');
    expect(yesterday).toMatchObject({ value: 8, outcome: 'success' });
  });

  it('Stay under — calm states under, at and over the limit', () => {
    const coffee = makeTracker({ name: 'Coffee', intent: 'limit', period: 'day', target: 3 });
    const now = at(2026, 3, 4, 15);
    const two = trackerSnapshot(coffee, makeEvents(coffee, [[at(2026, 3, 4, 9), 2]]), { now, weekStart });
    expect(two).toMatchObject({ hero: 2, remaining: 1, state: 'underLimit', over: null });
    const three = trackerSnapshot(coffee, makeEvents(coffee, [[at(2026, 3, 4, 9), 3]]), { now, weekStart });
    expect(three.state).toBe('atLimit');
    const four = trackerSnapshot(coffee, makeEvents(coffee, [[at(2026, 3, 4, 9), 4]]), { now, weekStart });
    expect(four).toMatchObject({ state: 'overLimit', over: 1, progress: 1 });
  });

  it('Reach weekly — 103 of 150 pages this week', () => {
    const reading = makeTracker({ name: 'Reading', intent: 'reach', period: 'week', target: 150 });
    const events = makeEvents(reading, [[at(2026, 3, 2, 21), 60], [at(2026, 3, 4, 21), 43]]);
    const snapshot = trackerSnapshot(reading, events, { now: at(2026, 3, 5, 12), weekStart });
    expect(snapshot).toMatchObject({ hero: 103, remaining: 47 });
  });

  it('Just count — running total with this month alongside', () => {
    const ideas = makeTracker({ name: 'Ideas' });
    const events = makeEvents(ideas, [[at(2026, 2, 20), 109], [at(2026, 3, 3), 19]]);
    const snapshot = trackerSnapshot(ideas, events, { now: at(2026, 3, 10), weekStart });
    expect(snapshot).toMatchObject({ hero: 128, thisMonth: 19 });
  });

  it('Build consistency — hero is active days this week', () => {
    const walks = makeTracker({ name: 'Walks', intent: 'consistency', period: 'week', target: 4 });
    const events = makeEvents(walks, [[at(2026, 3, 2), 1], [at(2026, 3, 3), 2], [at(2026, 3, 5), 1]]);
    const snapshot = trackerSnapshot(walks, events, { now: at(2026, 3, 5, 18), weekStart });
    expect(snapshot).toMatchObject({ hero: 3, remaining: 1, state: 'rhythm' });
  });
});

describe('Reduce comparisons are like-for-like', () => {
  const created = at(2026, 2, 1, 8);

  it('compares this week so far with the same point last week', () => {
    const cigarettes = makeTracker({ name: 'Cigarettes', intent: 'reduce', period: 'week' }, created);
    // Last week Mon–Wed: 29; the rest of last week would make a full-week comparison unfair.
    const events = makeEvents(cigarettes, [
      [at(2026, 2, 23, 10), 10],
      [at(2026, 2, 24, 10), 10],
      [at(2026, 2, 25, 10), 9],
      [at(2026, 2, 27, 10), 30],
      [at(2026, 3, 2, 10), 8],
      [at(2026, 3, 3, 10), 8],
      [at(2026, 3, 4, 10), 8],
    ]);
    const comparison = comparePeriods(cigarettes, events, { now: at(2026, 3, 4, 20), weekStart })!;
    expect(comparison.current).toBe(24);
    expect(comparison.previous).toBe(29);
    expect(comparison.direction).toBe('down');
    expect(Math.round(comparison.ratio! * 100)).toBe(-17);
  });

  it('refuses to compare before a full previous period exists', () => {
    const cigarettes = makeTracker({ name: 'Cigarettes', intent: 'reduce', period: 'week' }, at(2026, 2, 26));
    const events = makeEvents(cigarettes, [[at(2026, 2, 26), 4], [at(2026, 3, 3), 3]]);
    expect(comparePeriods(cigarettes, events, { now: at(2026, 3, 4), weekStart })).toBeNull();
  });
});

describe('consistency and streaks', () => {
  it('26 of the last 30 days, and a missed day does not erase consistency', () => {
    const tracker = makeTracker({ name: 'Walk', intent: 'consistency', period: 'week', target: 7 }, at(2026, 1, 1));
    const amounts = Array.from({ length: 30 }, (_, index) => ([3, 9, 15, 24].includes(index) ? 0 : 1));
    const events = makeEvents(tracker, dailyEntries(at(2026, 2, 3), amounts));
    const now = at(2026, 3, 4, 20);
    const summary = consistencySummary(tracker, events, { now, weekStart });
    expect(summary).toMatchObject({ kind: 'days', rule: 'active', success: 26, evaluated: 30 });
    const streak = streakSummary(tracker, events, { now, weekStart })!;
    expect(streak.unit).toBe('day');
    expect(streak.current).toBe(5);
    expect(streak.best).toBe(8);
  });

  it('today only counts once it succeeds, so mornings are never penalised', () => {
    const tracker = makeTracker({ name: 'Walk', intent: 'consistency', period: 'week', target: 7 }, at(2026, 2, 1));
    const events = makeEvents(tracker, dailyEntries(at(2026, 2, 25), [1, 1, 1, 1, 1, 1, 1]));
    const morning = streakSummary(tracker, events, { now: at(2026, 3, 4, 7), weekStart })!;
    expect(morning.current).toBe(7);
  });

  it('Stay under days count as within the limit, and new trackers are not judged on days before they existed', () => {
    const coffee = makeTracker({ name: 'Coffee', intent: 'limit', period: 'day', target: 3 }, at(2026, 3, 1, 8));
    const events = makeEvents(coffee, [[at(2026, 3, 1, 9), 2], [at(2026, 3, 2, 9), 5], [at(2026, 3, 3, 9), 3]]);
    const summary = consistencySummary(coffee, events, { now: at(2026, 3, 5, 10), weekStart });
    expect(summary).toMatchObject({ kind: 'days', rule: 'limit', success: 3, evaluated: 4 });
  });

  it('asks for more history when a tracker is brand new', () => {
    const tracker = makeTracker({ name: 'New' }, at(2026, 3, 4, 8));
    const summary = consistencySummary(tracker, makeEvents(tracker, [[at(2026, 3, 4, 9), 1]]), {
      now: at(2026, 3, 4, 10),
      weekStart,
    });
    expect(summary?.kind).toBe('insufficient');
  });

  it('weekly rhythm streaks count weeks, not days', () => {
    const tracker = makeTracker({ name: 'Gym', intent: 'consistency', period: 'week', target: 3 }, at(2026, 2, 2));
    const events = makeEvents(tracker, [
      [at(2026, 2, 9), 1], [at(2026, 2, 11), 1], [at(2026, 2, 13), 1],
      [at(2026, 2, 16), 1], [at(2026, 2, 18), 1], [at(2026, 2, 20), 1],
      [at(2026, 2, 23), 1], [at(2026, 2, 25), 1], [at(2026, 2, 27), 1],
      [at(2026, 3, 2), 1],
    ]);
    const streak = streakSummary(tracker, events, { now: at(2026, 3, 3), weekStart })!;
    expect(streak).toEqual({ unit: 'week', current: 3, best: 3 });
  });
});

describe('pace', () => {
  it('monthly Reach reports behind/ahead and the daily rate needed', () => {
    const reading = makeTracker({ name: 'Reading', intent: 'reach', period: 'month', target: 600 }, at(2026, 2, 1));
    const events = makeEvents(reading, [[at(2026, 3, 5), 100]]);
    const pace = reachPace(reading, events, { now: at(2026, 3, 16, 0, 0), weekStart })!;
    expect(pace.kind).toBe('period');
    if (pace.kind === 'period') {
      expect(pace.status).toBe('behind');
      expect(pace.perDayNeeded).toBe(Math.ceil(500 / 16));
    }
  });

  it('all-time Reach projects a date from the recent daily average', () => {
    const pushups = makeTracker({ name: 'Pushups', intent: 'reach', period: 'all', target: 500 }, at(2026, 3, 1));
    const events = makeEvents(pushups, dailyEntries(at(2026, 3, 1), Array(14).fill(20)));
    const pace = reachPace(pushups, events, { now: at(2026, 3, 14, 20), weekStart })!;
    expect(pace.kind).toBe('total');
    if (pace.kind === 'total') {
      expect(pace.averagePerDay).toBe(20);
      expect(pace.remaining).toBe(220);
      expect(pace.eta?.getDate()).toBe(14 + 11);
    }
  });
});
