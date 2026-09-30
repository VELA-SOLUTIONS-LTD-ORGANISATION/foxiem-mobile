import en from '@/i18n/locales/en.json';

import {
  DEFAULT_QUIET_HOURS,
  isQuietTime,
  minuteIsQuiet,
  parseQuietHours,
  quietEndsAt,
  timeIsQuiet,
  withQuietTime,
  type QuietHours,
} from '../quietHours';
import { smartSchedule, type Translate } from '../reminderCopy';
import { EVERY_DAY, type Reminder } from '../reminders';

import { at, dailyEntries, makeEvents, makeTracker } from './helpers';

const overnight: QuietHours = { enabled: true, start: '22:00', end: '07:00' };
const daytime: QuietHours = { enabled: true, start: '13:00', end: '14:30' };

const minute = (h: number, m = 0) => h * 60 + m;

const t: Translate = (key, options = {}) => {
  const template = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en);
  if (typeof template !== 'string') {
    throw new Error(`Missing copy: ${key}`);
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options[name]));
};

describe('quiet hours window', () => {
  it('handles a window that crosses midnight, start inclusive and end exclusive', () => {
    expect(minuteIsQuiet(minute(22), overnight)).toBe(true);
    expect(minuteIsQuiet(minute(23, 59), overnight)).toBe(true);
    expect(minuteIsQuiet(minute(0), overnight)).toBe(true);
    expect(minuteIsQuiet(minute(6, 59), overnight)).toBe(true);
    expect(minuteIsQuiet(minute(7), overnight)).toBe(false);
    expect(minuteIsQuiet(minute(21, 59), overnight)).toBe(false);
  });

  it('handles a same-day window', () => {
    expect(minuteIsQuiet(minute(13), daytime)).toBe(true);
    expect(minuteIsQuiet(minute(14, 29), daytime)).toBe(true);
    expect(minuteIsQuiet(minute(14, 30), daytime)).toBe(false);
    expect(minuteIsQuiet(minute(12, 59), daytime)).toBe(false);
  });

  it('is never quiet when disabled, empty or malformed', () => {
    expect(minuteIsQuiet(minute(23), { ...overnight, enabled: false })).toBe(false);
    expect(minuteIsQuiet(minute(8), { enabled: true, start: '08:00', end: '08:00' })).toBe(false);
    expect(minuteIsQuiet(minute(8), { enabled: true, start: 'soon', end: '09:00' })).toBe(false);
  });

  it('judges repeating reminders by their clock time', () => {
    expect(timeIsQuiet('23:30', overnight)).toBe(true);
    expect(timeIsQuiet('20:00', overnight)).toBe(false);
    expect(timeIsQuiet('nonsense', overnight)).toBe(false);
  });

  it('resumes at the end of the window, including across midnight', () => {
    expect(quietEndsAt(at(2026, 3, 10, 23, 30), overnight)).toEqual(at(2026, 3, 11, 7, 0));
    expect(quietEndsAt(at(2026, 3, 11, 3, 0), overnight)).toEqual(at(2026, 3, 11, 7, 0));
    expect(quietEndsAt(at(2026, 3, 11, 12, 0), overnight)).toBeNull();
    expect(isQuietTime(at(2026, 3, 11, 6, 59), overnight)).toBe(true);
    expect(isQuietTime(at(2026, 3, 11, 7, 0), overnight)).toBe(false);
  });

  it('keeps its shape through storage and edits', () => {
    expect(parseQuietHours(undefined)).toEqual(DEFAULT_QUIET_HOURS);
    expect(parseQuietHours({ enabled: 'yes', start: '25:99', end: '06:30' })).toEqual({
      enabled: false,
      start: DEFAULT_QUIET_HOURS.start,
      end: '06:30',
    });
    expect(withQuietTime(overnight, 'start', 21, 5)).toEqual({ ...overnight, start: '21:05' });
  });
});

describe('reminders honour quiet hours and finished goals', () => {
  const water = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8 });
  const reminder: Reminder = {
    id: 'r1',
    trackerId: water.id,
    enabled: true,
    time: '20:00',
    days: [...EVERY_DAY],
    smart: true,
    messageKey: null,
    notificationIds: [],
    createdAt: '2026-01-01T08:00:00.000Z',
  };
  const now = at(2026, 3, 11, 9);
  const context = { now, weekStart: 1 as const };

  it('skips, and does not shift, occurrences inside the window', () => {
    const open = smartSchedule(water, [], reminder, context, t);
    const quiet = smartSchedule(water, [], reminder, { ...context, quiet: { enabled: true, start: '19:00', end: '21:00' } }, t);
    expect(open.length).toBeGreaterThan(0);
    expect(quiet).toEqual([]);

    const before = smartSchedule(water, [], { ...reminder, time: '18:00' }, { ...context, quiet: { enabled: true, start: '19:00', end: '21:00' } }, t);
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((entry) => entry.date.getHours() === 18)).toBe(true);
  });

  it('sends nothing for today once the goal is reached, but still reminds tomorrow', () => {
    const done = makeEvents(water, dailyEntries(at(2026, 3, 11), [8]));
    const schedule = smartSchedule(water, done, reminder, context, t);
    expect(schedule.some((entry) => entry.date.getDate() === 11)).toBe(false);
    expect(schedule.some((entry) => entry.date.getDate() === 12)).toBe(true);
  });
});
