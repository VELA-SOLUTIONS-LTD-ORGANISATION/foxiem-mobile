import { comparePeriods, trackerSnapshot } from './analysis';
import { currentPeriodValue } from './events';
import { isInRange, periodRange } from './periods';
import { upcomingOccurrences, type Reminder } from './reminders';
import type { CountEvent, Tracker, WeekStart } from './types';

export type Translate = (key: string, options?: Record<string, unknown>) => string;

export type ReminderContent = { title: string; body: string };

function periodPhrase(tracker: Tracker): 'day' | 'week' | 'month' | 'all' {
  return tracker.period;
}

/** Fixed copy that stays true whenever it fires (standard reminders, Free). */
export function standardReminderContent(tracker: Tracker | null, reminder: Reminder, t: Translate): ReminderContent {
  if (!tracker) {
    return {
      title: t('about.appName'),
      body: reminder.messageKey ? t(reminder.messageKey) : t('reminders.copy.checkIn'),
    };
  }
  const title = tracker.name;
  switch (tracker.intent) {
    case 'reach':
      return { title, body: t(`reminders.copy.reach.${periodPhrase(tracker)}`, { target: tracker.target ?? 0 }) };
    case 'limit':
      return { title, body: t(`reminders.copy.limit.${periodPhrase(tracker)}`, { limit: tracker.target ?? 0 }) };
    case 'reduce':
      return { title, body: t('reminders.copy.reduce') };
    case 'consistency':
      return { title, body: t('reminders.copy.consistency') };
    default:
      return { title, body: t('reminders.copy.count') };
  }
}

/**
 * Copy for a single upcoming occurrence of a smart reminder. Uses the live value when the
 * occurrence falls in the current period and assumes nothing is logged yet for later periods.
 * Returns null when the reminder has nothing useful to say (the goal is already met).
 */
export function smartOccurrenceContent(
  tracker: Tracker,
  events: readonly CountEvent[],
  reminder: Reminder,
  occurrence: Date,
  context: { now: Date; weekStart: WeekStart },
  t: Translate,
): ReminderContent | null {
  const standard = standardReminderContent(tracker, reminder, t);
  const inCurrentPeriod =
    tracker.period === 'all' || isInRange(occurrence, periodRange(tracker.period, context.now, context.weekStart));
  const sameDay = isInRange(occurrence, periodRange('day', context.now, context.weekStart));
  const title = tracker.name;

  switch (tracker.intent) {
    case 'reach': {
      if (!tracker.target) {
        return standard;
      }
      const value = inCurrentPeriod ? currentPeriodValue(tracker, events, context.now, context.weekStart) : 0;
      const remaining = tracker.target - value;
      if (remaining <= 0) {
        return null;
      }
      return inCurrentPeriod && value > 0
        ? { title, body: t(`reminders.copy.smart.reachRemaining.${periodPhrase(tracker)}`, { count: remaining }) }
        : standard;
    }
    case 'limit': {
      if (!tracker.target || !inCurrentPeriod) {
        return standard;
      }
      const value = currentPeriodValue(tracker, events, context.now, context.weekStart);
      if (value === 0) {
        return standard;
      }
      if (value < tracker.target) {
        return { title, body: t(`reminders.copy.smart.limitLeft.${periodPhrase(tracker)}`, { count: tracker.target - value }) };
      }
      return { title, body: t('reminders.copy.smart.limitReached', { value, limit: tracker.target }) };
    }
    case 'consistency': {
      if (!sameDay) {
        return standard;
      }
      const snapshot = trackerSnapshot(tracker, events, context);
      if (snapshot.today > 0) {
        return null;
      }
      return {
        title,
        body: t('reminders.copy.smart.rhythm', { active: snapshot.activeDaysThisWeek, target: tracker.target ?? 7 }),
      };
    }
    case 'reduce': {
      if (!inCurrentPeriod) {
        return standard;
      }
      const comparison = comparePeriods(tracker, events, context);
      if (!comparison) {
        return standard;
      }
      return {
        title,
        body: t(`reminders.copy.smart.reduce.${comparison.period}`, {
          current: comparison.current,
          previous: comparison.previous,
        }),
      };
    }
    default: {
      if (!sameDay) {
        return standard;
      }
      const value = trackerSnapshot(tracker, events, context).today;
      return value > 0 ? { title, body: t('reminders.copy.smart.countToday', { count: value }) } : standard;
    }
  }
}

export function smartSchedule(
  tracker: Tracker,
  events: readonly CountEvent[],
  reminder: Reminder,
  context: { now: Date; weekStart: WeekStart },
  t: Translate,
): { date: Date; content: ReminderContent }[] {
  return upcomingOccurrences(reminder, context.now).flatMap((date) => {
    const content = smartOccurrenceContent(tracker, events, reminder, date, context, t);
    return content ? [{ date, content }] : [];
  });
}
