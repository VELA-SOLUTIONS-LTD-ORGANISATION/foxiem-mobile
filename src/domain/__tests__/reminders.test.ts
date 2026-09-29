import en from '@/i18n/locales/en.json';

import { smartSchedule, standardReminderContent, type Translate } from '../reminderCopy';
import {
  EVERY_DAY,
  FREE_REMINDERS_PER_TRACKER,
  PRO_REMINDERS_PER_TRACKER,
  canAddReminder,
  reminderAllowed,
  upcomingOccurrences,
  type Reminder,
} from '../reminders';

import { at, makeEvents, makeTracker } from './helpers';

function reminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: 'r1',
    trackerId: 'tracker.Water',
    enabled: true,
    time: '20:00',
    days: [...EVERY_DAY],
    smart: false,
    messageKey: null,
    notificationIds: [],
    createdAt: '2026-01-01T08:00:00.000Z',
    ...overrides,
  };
}

/** Resolves keys against the English file and interpolates, like i18next. */
const t: Translate = (key, options = {}) => {
  const template = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en);
  if (typeof template !== 'string') {
    throw new Error(`Missing copy: ${key}`);
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options[name]));
};

describe('reminder limits', () => {
  it('Free allows one reminder per tracker, Pro five', () => {
    const first = reminder({ id: 'a' });
    expect(canAddReminder('tracker.Water', [], false)).toBe(true);
    expect(canAddReminder('tracker.Water', [first], false)).toBe(false);
    expect(canAddReminder('tracker.Coffee', [first], false)).toBe(true);
    const four = ['a', 'b', 'c', 'd'].map((id) => reminder({ id }));
    expect(canAddReminder('tracker.Water', four, true)).toBe(true);
    expect(canAddReminder('tracker.Water', [...four, reminder({ id: 'e' })], true)).toBe(false);
    expect(FREE_REMINDERS_PER_TRACKER).toBe(1);
    expect(PRO_REMINDERS_PER_TRACKER).toBe(5);
  });

  it('pauses extra reminders when Pro ends instead of deleting them, and keeps 1.0 reminders running', () => {
    const oldest = reminder({ id: 'old', createdAt: '2026-01-01T08:00:00.000Z' });
    const newer = reminder({ id: 'new', createdAt: '2026-02-01T08:00:00.000Z' });
    const legacyA = reminder({ id: 'l1', trackerId: null, messageKey: 'notifications.messages.daily' });
    const legacyB = reminder({ id: 'l2', trackerId: null, messageKey: 'notifications.messages.momentum' });
    const all = [newer, oldest, legacyA, legacyB];
    expect(reminderAllowed(oldest, all, false)).toBe(true);
    expect(reminderAllowed(newer, all, false)).toBe(false);
    expect(reminderAllowed(newer, all, true)).toBe(true);
    expect(reminderAllowed(legacyA, all, false)).toBe(true);
    expect(reminderAllowed(legacyB, all, false)).toBe(true);
  });

  it('schedules only future occurrences on the chosen days', () => {
    const monday9am = at(2026, 3, 2, 9);
    const weekdays = upcomingOccurrences({ time: '08:30', days: ['monday', 'wednesday'] }, monday9am);
    expect(weekdays.map((date) => [date.getDate(), date.getHours(), date.getMinutes()])).toEqual([
      [4, 8, 30],
      [9, 8, 30],
    ]);
    expect(upcomingOccurrences({ time: '25:00', days: ['monday'] }, monday9am)).toEqual([]);
    expect(upcomingOccurrences({ time: '08:00', days: [] }, monday9am)).toEqual([]);
  });
});

describe('reminder copy', () => {
  const context = { now: at(2026, 3, 2, 9), weekStart: 1 as const };

  it('standard copy never claims progress it cannot know', () => {
    const water = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8 });
    expect(standardReminderContent(water, reminder({}), t)).toEqual({ title: 'Water', body: "Today's target: 8." });
    const legacy = reminder({ trackerId: null, messageKey: 'notifications.messages.daily' });
    expect(standardReminderContent(null, legacy, t).body).toBe('Time for your Foxiem count.');
  });

  it('smart reach reminders say what is left and skip a day once the target is met', () => {
    const water = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8 });
    const smart = reminder({ smart: true, time: '20:00' });

    const partway = makeEvents(water, [[at(2026, 3, 2, 8), 6]]);
    const [today, tomorrow] = smartSchedule(water, partway, smart, context, t);
    expect(today).toMatchObject({ content: { body: '2 to go for today\'s target.' } });
    expect(today!.date.getDate()).toBe(2);
    expect(tomorrow).toMatchObject({ content: { body: "Today's target: 8." } });

    const done = makeEvents(water, [[at(2026, 3, 2, 8), 8]]);
    const schedule = smartSchedule(water, done, smart, context, t);
    expect(schedule[0]!.date.getDate()).toBe(3);
  });

  it('smart limit reminders report what is left within the limit', () => {
    const coffee = makeTracker({ name: 'Coffee', intent: 'limit', period: 'day', target: 3 });
    const events = makeEvents(coffee, [[at(2026, 3, 2, 8), 2]]);
    const [first] = smartSchedule(coffee, events, reminder({ smart: true, trackerId: coffee.id }), context, t);
    expect(first!.content.body).toBe("1 left within today's limit.");
  });
});
