import { globalInsights, patternReadiness, trackerInsights } from '../insights';
import { monthlyReview, weeklyReview } from '../review';

import { at, dailyEntries, makeEvents, makeTracker } from './helpers';

const weekStart = 1 as const;

describe('insights never invent patterns', () => {
  it('a new tracker gets no patterns, only an honest readiness state', () => {
    const tracker = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8 }, at(2026, 3, 1));
    const events = makeEvents(tracker, dailyEntries(at(2026, 3, 1), [8, 6, 8]));
    const context = { now: at(2026, 3, 3, 20), weekStart };
    expect(trackerInsights(tracker, events, context).filter((insight) => insight.tier === 'pro')).toEqual([]);
    expect(patternReadiness(tracker, events, context)).toEqual({ ready: false, daysNeeded: 18 });
  });

  it('reports the target hit rate over the last 7 complete days', () => {
    const reading = makeTracker({ name: 'Reading', intent: 'reach', period: 'day', target: 20 }, at(2026, 2, 1));
    const events = makeEvents(reading, dailyEntries(at(2026, 2, 24), [25, 20, 5, 30, 22, 21, 20]));
    const insights = trackerInsights(reading, events, { now: at(2026, 3, 3, 9), weekStart });
    expect(insights).toContainEqual(
      expect.objectContaining({ kind: 'hitRate', rule: 'target', success: 6, days: 7 }),
    );
  });

  it('finds a clear weekday pattern only when the data supports it', () => {
    const tracker = makeTracker({ name: 'Calls' }, at(2026, 1, 5));
    // Eight weeks: Mondays 12, other days 3.
    const amounts = Array.from({ length: 56 }, (_, index) => (index % 7 === 0 ? 12 : 3));
    const events = makeEvents(tracker, dailyEntries(at(2026, 1, 5), amounts));
    const insights = trackerInsights(tracker, events, { now: at(2026, 3, 2, 8), weekStart });
    expect(insights).toContainEqual(expect.objectContaining({ kind: 'weekday', weekday: 1 }));

    const flat = makeEvents(tracker, dailyEntries(at(2026, 1, 5), Array(56).fill(4)));
    expect(trackerInsights(tracker, flat, { now: at(2026, 3, 2, 8), weekStart }).some((i) => i.kind === 'weekday')).toBe(false);
  });

  it('detects a cross-tracker relationship with enough overlapping days', () => {
    const workout = makeTracker({ name: 'Workout' }, at(2026, 1, 1));
    const water = makeTracker({ name: 'Water2', intent: 'reach', period: 'day', target: 8 }, at(2026, 1, 1));
    const days = 40;
    const workoutAmounts = Array.from({ length: days }, (_, index) => (index % 2 === 0 ? 1 : 0));
    const waterAmounts = Array.from({ length: days }, (_, index) => (index % 2 === 0 ? 10 : 6));
    const eventsByTracker = {
      [workout.id]: makeEvents(workout, dailyEntries(at(2026, 1, 20), workoutAmounts)),
      [water.id]: makeEvents(water, dailyEntries(at(2026, 1, 20), waterAmounts)),
    };
    const insights = globalInsights([workout, water], eventsByTracker, { now: at(2026, 3, 1, 9), weekStart });
    const cross = insights.find(
      (insight) => insight.kind === 'crossTracker' && insight.driverId === workout.id && insight.subjectId === water.id,
    );
    expect(cross).toBeDefined();
    if (cross?.kind === 'crossTracker') {
      expect(Math.round(cross.ratio * 100)).toBe(67);
    }
  });
});

describe('reviews', () => {
  it('summarises the last complete week without inventing comparisons', () => {
    const water = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8 }, at(2026, 2, 1));
    const coffee = makeTracker({ name: 'Coffee', intent: 'limit', period: 'day', target: 3 }, at(2026, 2, 1));
    const fresh = makeTracker({ name: 'Fresh' }, at(2026, 2, 26));
    const eventsByTracker = {
      [water.id]: makeEvents(water, dailyEntries(at(2026, 2, 23), [8, 8, 5, 8, 9, 2, 8])),
      [coffee.id]: makeEvents(coffee, dailyEntries(at(2026, 2, 23), [2, 3, 4, 1, 2, 2, 3])),
      [fresh.id]: makeEvents(fresh, dailyEntries(at(2026, 2, 26), [1, 1])),
    };
    const review = weeklyReview([water, coffee, fresh], eventsByTracker, { now: at(2026, 3, 4), weekStart });
    expect(review.available).toBe(true);
    expect(review.range.start).toEqual(at(2026, 2, 23, 0));
    expect(review.lines).toContainEqual(expect.objectContaining({ trackerId: water.id, kind: 'dailyTarget', success: 5, days: 7 }));
    expect(review.lines).toContainEqual(expect.objectContaining({ trackerId: coffee.id, kind: 'dailyLimit', success: 6, days: 7 }));
    expect(review.lines).toContainEqual(expect.objectContaining({ trackerId: fresh.id, kind: 'change', ratio: null }));
    expect(review.targetsReached).toBe(5);
  });

  it('monthly review compares with the previous month only when it fully existed', () => {
    const ideas = makeTracker({ name: 'Ideas' }, at(2026, 1, 1));
    const events = makeEvents(ideas, [[at(2026, 1, 10), 40], [at(2026, 2, 10), 30]]);
    const review = monthlyReview([ideas], { [ideas.id]: events }, { now: at(2026, 3, 3), weekStart });
    expect(review.lines[0]).toMatchObject({ total: 30, previous: 40, ratio: -0.25 });
  });
});
