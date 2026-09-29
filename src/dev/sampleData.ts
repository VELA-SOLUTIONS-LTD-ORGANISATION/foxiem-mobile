import { rebuildChain } from '@/domain/events';
import { addDays, startOfDay } from '@/domain/periods';
import { createTracker, emptyDraft } from '@/domain/trackers';
import type { CountEvent, Tracker, TrackerDraft } from '@/domain/types';

type Sample = { draft: Partial<TrackerDraft>; perDay: (dayIndex: number, weekday: number) => number; hours: number[] };

/** Deterministic pseudo-random so QA screenshots are reproducible. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const SAMPLES: Sample[] = [
  {
    draft: { name: 'Water', icon: 'cup-water', color: 'sky', intent: 'reach', period: 'day', target: 8, unit: 'glasses' },
    perDay: (day, weekday) => Math.round(5 + noise(day) * 4 + (weekday === 2 || weekday === 4 ? 1 : 0)),
    hours: [8, 11, 14, 17, 20],
  },
  {
    draft: { name: 'Coffee', icon: 'coffee-outline', color: 'cocoa', intent: 'limit', period: 'day', target: 3 },
    perDay: (day) => Math.round(1 + noise(day + 7) * 3),
    hours: [8, 13, 16],
  },
  {
    draft: { name: 'Reading', icon: 'book-open-page-variant-outline', color: 'leaf', intent: 'reach', period: 'week', target: 150, unit: 'pages', step: 5 },
    perDay: (day, weekday) => (weekday === 2 || weekday === 4 ? 35 : noise(day + 3) > 0.45 ? 15 : 0),
    hours: [21],
  },
  {
    draft: { name: 'Cigarettes', icon: 'smoking', color: 'slate', intent: 'reduce', period: 'week', baseline: 70 },
    perDay: (day) => Math.max(0, Math.round(10 - day / 9 + noise(day + 11) * 3)),
    hours: [9, 12, 15, 18, 21],
  },
  {
    draft: { name: 'Ideas', icon: 'lightbulb-on-outline', color: 'honey', intent: 'count', period: 'all' },
    perDay: (day) => (noise(day + 5) > 0.5 ? 2 : noise(day + 9) > 0.7 ? 1 : 0),
    hours: [10, 19],
  },
  {
    draft: { name: 'Dog walks', icon: 'dog-side', color: 'fox', intent: 'consistency', period: 'week', target: 7 },
    perDay: (day) => (noise(day + 13) > 0.12 ? 1 : 0),
    hours: [7],
  },
  {
    draft: { name: 'Workout', icon: 'dumbbell', color: 'iris', intent: 'consistency', period: 'week', target: 3 },
    perDay: (day, weekday) => (weekday === 1 || weekday === 3 || (weekday === 6 && noise(day) > 0.4) ? 1 : 0),
    hours: [18],
  },
];

const EXTRA_NAMES = [
  'Sales calls',
  'Push-ups',
  'Prayer',
  'Knitting rows for the winter blanket project',
  'Snacks',
  'Meditation',
  'Language practice',
  'Guitar',
  'Steps outside',
  'Emails answered',
  'Stretching',
  'Vitamins',
  'Takeaways',
];

/** A realistic set of trackers with 60 days of history for visual and performance QA. */
export function buildSampleTrackers(existing: readonly Tracker[], count: 'core' | 'many', now: Date = new Date()) {
  const days = 60;
  const start = addDays(startOfDay(now), -(days - 1));
  const created = addDays(start, -1);
  const samples: Sample[] = [...SAMPLES];
  if (count === 'many') {
    EXTRA_NAMES.forEach((name, index) =>
      samples.push({
        draft: { name, color: (['teal', 'berry', 'honey', 'leaf', 'sky', 'fox'] as const)[index % 6], intent: 'count', period: index % 2 ? 'day' : 'all' },
        perDay: (day) => Math.round(noise(day + index * 17) * 6),
        hours: [9, 15],
      }),
    );
  }
  const all: Tracker[] = [...existing];
  const result: { tracker: Tracker; events: CountEvent[] }[] = [];
  samples.forEach((sample, sampleIndex) => {
    const tracker = createTracker(emptyDraft(sample.draft), all, { now: created, id: `tracker.sample-${sampleIndex}-${now.getTime()}` });
    all.push(tracker);
    const events: CountEvent[] = [];
    for (let day = 0; day < days; day += 1) {
      const date = addDays(start, day);
      const total = sample.perDay(day, date.getDay());
      if (total <= 0) {
        continue;
      }
      const slots = sample.hours.length;
      let remaining = total;
      sample.hours.forEach((hour, slot) => {
        const amount = slot === slots - 1 ? remaining : Math.floor(total / slots);
        remaining -= amount;
        const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, Math.round(noise(day + slot) * 50));
        if (amount > 0 && at.getTime() <= now.getTime()) {
          events.push({
            id: `${tracker.id}.${day}.${slot}`,
            trackerId: tracker.id,
            type: 'increment',
            amount,
            previousValue: 0,
            newValue: 0,
            createdAt: at.toISOString(),
            source: 'tap',
          });
        }
      });
    }
    result.push({ tracker, events: rebuildChain(tracker.startingValue, events) });
  });
  return result;
}
