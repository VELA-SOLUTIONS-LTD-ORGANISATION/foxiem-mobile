import type { TFunction } from 'i18next';

import type { ConsistencySummary, Comparison, StreakSummary, TrackerSnapshot } from '@/domain/analysis';
import type { Tracker } from '@/domain/types';

import { formatNumber, formatPercent, relativeDay } from './format';

type RangedPeriod = 'day' | 'week' | 'month';

function ranged(period: Tracker['period']): RangedPeriod {
  return period === 'all' ? 'day' : period;
}

/** Templates contain an optional `{{unit}}`; collapse the gap and stray separators when it is empty. */
export function tidy(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[\s·:]+|[\s·:]+$/g, '')
    .replace(/\s+([.,])/g, '$1')
    .trim();
}

/** "Stay under 3 a day", "Reach 30 pages a day", "5 days a week". */
export function describeGoal(tracker: Pick<Tracker, 'intent' | 'period' | 'target' | 'unit'>, t: TFunction, locale: string): string {
  const target = formatNumber(tracker.target ?? 0, locale);
  const unit = tracker.unit ?? '';
  switch (tracker.intent) {
    case 'count':
      return t(`goal.count.${tracker.period}`);
    case 'reach':
      return tidy(t(`goal.reach.${tracker.period}`, { target, unit }));
    case 'limit':
      return tidy(t(`goal.limit.${ranged(tracker.period)}`, { target, unit }));
    case 'reduce':
      return t(`goal.reduce.${ranged(tracker.period)}`);
    case 'consistency':
      return (tracker.target ?? 7) >= 7 ? t('goal.consistencyDaily') : t('goal.consistency', { count: tracker.target ?? 7 });
  }
}

export function comparisonText(comparison: Comparison, t: TFunction, locale: string): string {
  const { period } = comparison;
  if (comparison.direction === 'same') {
    return t(`status.same.${period}`);
  }
  if (comparison.ratio === null) {
    return t(`status.upFromZero.${period}`, { count: formatNumber(comparison.current, locale) });
  }
  const percent = formatPercent(comparison.ratio, locale);
  return comparison.direction === 'down' ? t(`status.down.${period}`, { percent }) : t(`status.up.${period}`, { percent });
}

/** Insights tab: what this week looked like for the tracker's intent. */
export function weekSummaryLine(tracker: Tracker, snapshot: TrackerSnapshot, t: TFunction, locale: string): string {
  const weekTotal = snapshot.week.reduce((sum, day) => sum + Math.max(0, day.value), 0);
  const evaluated = snapshot.week.filter((day) => day.outcome === 'success' || day.outcome === 'miss');
  const success = evaluated.filter((day) => day.outcome === 'success').length;
  const n = (value: number) => formatNumber(value, locale);
  if (tracker.period === 'day' && tracker.target && (tracker.intent === 'reach' || tracker.intent === 'limit')) {
    if (evaluated.length === 0) {
      return t('insights.weekLine.noDays');
    }
    return tracker.intent === 'reach'
      ? t('insights.weekLine.daysOnTarget', { success, days: evaluated.length })
      : t('insights.weekLine.daysWithinLimit', { success, days: evaluated.length });
  }
  if (tracker.period === 'week' && tracker.target && tracker.intent === 'reach') {
    return t('insights.weekLine.periodTarget', { value: n(snapshot.periodValue), target: n(tracker.target) });
  }
  if (tracker.period === 'week' && tracker.target && tracker.intent === 'limit') {
    return t('insights.weekLine.periodLimit', { value: n(snapshot.periodValue), target: n(tracker.target) });
  }
  if (tracker.intent === 'consistency') {
    return t('insights.weekLine.rhythm', { value: snapshot.activeDaysThisWeek, target: tracker.target ?? 7 });
  }
  if (tracker.intent === 'reduce' && tracker.period === 'week' && snapshot.comparison) {
    return comparisonText(snapshot.comparison, t, locale);
  }
  return t('insights.weekLine.total', { value: n(weekTotal) });
}

/** The single status line under a tracker's name on Home. */
export function statusLine(
  tracker: Tracker,
  snapshot: TrackerSnapshot,
  t: TFunction,
  locale: string,
  now: Date,
): string {
  const count = (value: number | null) => formatNumber(value ?? 0, locale);
  switch (tracker.intent) {
    case 'reach':
      if (snapshot.state === 'reached') {
        const over = snapshot.periodValue - (tracker.target ?? 0);
        return over > 0 ? t('status.reachedOver', { count: count(over) }) : t('status.reached');
      }
      return t(`status.toGo.${tracker.period}`, { count: count(snapshot.remaining) });
    case 'limit': {
      const period = ranged(tracker.period);
      if (snapshot.state === 'overLimit') {
        return t(`status.over.${period}`, { count: count(snapshot.over) });
      }
      if (snapshot.state === 'atLimit') {
        return t(`status.atLimit.${period}`);
      }
      return t(`status.left.${period}`, { count: count(snapshot.remaining) });
    }
    case 'reduce': {
      if (snapshot.comparison) {
        return comparisonText(snapshot.comparison, t, locale);
      }
      const period = ranged(tracker.period);
      return tracker.baseline !== null
        ? t(`status.usual.${period}`, { count: count(tracker.baseline) })
        : t(`status.comparisonSoon.${period}`);
    }
    case 'consistency':
      if (snapshot.state === 'reached') {
        return t('status.rhythmMet');
      }
      if (snapshot.today > 1) {
        return t('status.sessionsToday', { count: count(snapshot.today) });
      }
      return snapshot.today > 0 ? t('status.loggedToday') : t('status.notYetToday');
    default: {
      if (tracker.period !== 'all') {
        return lastPeriodLine(tracker, snapshot, t, locale);
      }
      if (snapshot.thisMonth > 0) {
        return t('status.thisMonth', { count: count(snapshot.thisMonth) });
      }
      if (snapshot.lastEventAt) {
        const when = relativeDay(snapshot.lastEventAt, now, locale);
        const label =
          when.kind === 'today' ? t('common.today') : when.kind === 'yesterday' ? t('common.yesterday') : when.label;
        return t('status.lastEntry', { when: label.toLocaleLowerCase(locale) });
      }
      return t('status.noEntries');
    }
  }
}

function lastPeriodLine(tracker: Tracker, snapshot: TrackerSnapshot, t: TFunction, locale: string): string {
  const previous = snapshot.comparison?.previous;
  if (previous === undefined) {
    return snapshot.hasEvents ? t(`periods.current.${tracker.period}`) : t('status.noEntries');
  }
  const count = formatNumber(previous, locale);
  if (tracker.period === 'day') {
    return t('status.yesterday', { count });
  }
  return tracker.period === 'week' ? t('status.lastWeek', { count }) : t('status.lastMonth', { count });
}

/** Small label under the number on Home: "of 8", "max 3", "total", "this week". */
export function numberCaption(tracker: Tracker, t: TFunction, locale: string): string {
  const target = formatNumber(tracker.target ?? 0, locale);
  switch (tracker.intent) {
    case 'reach':
      return t('status.of', { target });
    case 'limit':
      return t('status.max', { target });
    case 'consistency':
      return t('status.ofDays', { target: tracker.target ?? 7 });
    default:
      return tracker.period === 'all' ? tracker.unit ?? t('status.total') : t(`periods.current.${tracker.period}`);
  }
}

/** Line under the hero number on Tracker Detail. */
export function heroCaption(tracker: Tracker, t: TFunction, locale: string): string {
  const unit = tracker.unit ?? '';
  const target = formatNumber(tracker.target ?? 0, locale);
  switch (tracker.intent) {
    case 'reach':
      return tidy(t(`detail.heroOf.${tracker.period}`, { target, unit }));
    case 'limit':
      return tidy(t(`detail.heroMax.${ranged(tracker.period)}`, { target, unit }));
    case 'consistency':
      return t('detail.heroDays', { target: tracker.target ?? 7 });
    default:
      return tidy(t(`detail.heroPeriod.${tracker.period}`, { unit }));
  }
}

export function statusSentence(tracker: Tracker, snapshot: TrackerSnapshot, t: TFunction, locale: string, now: Date): string {
  if (tracker.intent === 'limit' && snapshot.state === 'underLimit') {
    return t(`status.leftLong.${ranged(tracker.period)}`, { count: formatNumber(snapshot.remaining ?? 0, locale) });
  }
  return statusLine(tracker, snapshot, t, locale, now);
}

export function streakText(streak: StreakSummary, value: number, t: TFunction): string {
  if (streak.unit === 'week') {
    return t('detail.streakWeeks', { count: value });
  }
  if (streak.unit === 'month') {
    return t('detail.streakMonths', { count: value });
  }
  return t('detail.streakDays', { count: value });
}

export function consistencyText(summary: Exclude<ConsistencySummary, { kind: 'insufficient' }>, t: TFunction): string {
  if (summary.kind === 'periods') {
    return t(`detail.consistencyPeriods.${summary.period}`, { success: summary.success, count: summary.evaluated });
  }
  if (summary.rule === 'rhythm') {
    return t('detail.consistencyPlanned', { success: summary.success, planned: summary.planned });
  }
  return t('detail.consistencyWindow', { success: summary.success, days: summary.evaluated });
}

export function formatDelta(delta: number, locale: string): string {
  const magnitude = formatNumber(Math.abs(delta), locale);
  return delta >= 0 ? `+${magnitude}` : `−${magnitude}`;
}
