import type { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import type { Insight } from '@/domain/insights';
import type { Tracker } from '@/domain/types';
import { formatDecimal, formatNumber, formatPercent, formatShortDate } from '@/format';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export type InsightCopy = { icon: keyof typeof Ionicons.glyphMap; text: string };

/** Turn a computed insight into one calm sentence. Returns null if a referenced tracker is gone. */
export function insightCopy(
  insight: Insight,
  trackers: readonly Tracker[],
  t: TFunction,
  locale: string,
  now: Date,
): InsightCopy | null {
  const nameOf = (id: string) => trackers.find((tracker) => tracker.id === id)?.name ?? null;
  switch (insight.kind) {
    case 'comparison': {
      const name = nameOf(insight.trackerId);
      if (!name) {
        return null;
      }
      const { comparison } = insight;
      const { period } = comparison;
      if (comparison.direction === 'same') {
        return { icon: 'reorder-two-outline', text: t(`insight.comparison.same.${period}`, { name }) };
      }
      if (comparison.ratio === null) {
        return {
          icon: 'trending-up-outline',
          text: t(`insight.comparison.upFromZero.${period}`, { name, count: formatNumber(comparison.current, locale) }),
        };
      }
      const percent = formatPercent(comparison.ratio, locale);
      return comparison.direction === 'down'
        ? { icon: 'trending-down-outline', text: t(`insight.comparison.down.${period}`, { name, percent }) }
        : { icon: 'trending-up-outline', text: t(`insight.comparison.up.${period}`, { name, percent }) };
    }
    case 'hitRate': {
      const name = nameOf(insight.trackerId);
      if (!name) {
        return null;
      }
      return {
        icon: insight.rule === 'target' ? 'flag-outline' : 'shield-checkmark-outline',
        text: t(`insight.hitRate.${insight.rule}`, { name, success: insight.success, days: insight.days }),
      };
    }
    case 'average': {
      const tracker = trackers.find((item) => item.id === insight.trackerId);
      if (!tracker) {
        return null;
      }
      const average = formatDecimal(insight.average, locale);
      return {
        icon: 'stats-chart-outline',
        text: tracker.unit
          ? t('insight.averageUnit', { name: tracker.name, average, unit: tracker.unit, days: insight.days })
          : t('insight.average', { name: tracker.name, average, days: insight.days }),
      };
    }
    case 'weekday': {
      const name = nameOf(insight.trackerId);
      if (!name) {
        return null;
      }
      return { icon: 'calendar-outline', text: t(`insight.weekday.${WEEKDAYS[insight.weekday]!}`, { name }) };
    }
    case 'dayPart': {
      const name = nameOf(insight.trackerId);
      if (!name) {
        return null;
      }
      return { icon: 'time-outline', text: t(`insight.dayPart.${insight.part}`, { name }) };
    }
    case 'pace': {
      const tracker = trackers.find((item) => item.id === insight.trackerId);
      if (!tracker) {
        return null;
      }
      const { pace } = insight;
      if (pace.kind === 'total') {
        const target = formatNumber(tracker.target ?? 0, locale);
        return pace.eta
          ? { icon: 'flag-outline', text: t('insight.pace.eta', { target, date: formatShortDate(pace.eta, locale, now) }) }
          : { icon: 'flag-outline', text: t('insight.pace.etaNone', { target }) };
      }
      if (tracker.period !== 'week' && tracker.period !== 'month') {
        return null;
      }
      const period = tracker.period;
      const name = tracker.name;
      if (pace.status === 'behind' && pace.perDayNeeded) {
        return {
          icon: 'speedometer-outline',
          text: t(`insight.pace.needed.${period}`, { name, count: formatNumber(pace.perDayNeeded, locale) }),
        };
      }
      const lead = pace.status === 'ahead' ? t(`insight.pace.ahead.${period}`, { name }) : t(`insight.pace.onPace.${period}`, { name });
      const projected =
        pace.projected !== null ? ` ${t(`insight.pace.projected.${period}`, { count: formatNumber(pace.projected, locale) })}` : '';
      return { icon: 'speedometer-outline', text: `${lead}${projected}` };
    }
    case 'weeks': {
      const name = nameOf(insight.trackerId);
      if (!name) {
        return null;
      }
      return {
        icon: 'analytics-outline',
        text: t('insight.weeks', { name, values: insight.totals.map((value) => formatNumber(value, locale)).join(' → ') }),
      };
    }
    case 'crossTracker': {
      const driver = nameOf(insight.driverId);
      const subject = nameOf(insight.subjectId);
      if (!driver || !subject) {
        return null;
      }
      const percent = formatPercent(insight.ratio, locale);
      return {
        icon: 'git-compare-outline',
        text: insight.ratio >= 0
          ? t('insight.cross.higher', { driver, subject, percent })
          : t('insight.cross.lower', { driver, subject, percent }),
      };
    }
    case 'activeDays':
      return { icon: 'checkmark-done-outline', text: t('insight.activeDays', { success: insight.success, days: insight.days }) };
    case 'targetsThisWeek':
      return { icon: 'flag-outline', text: t('insight.targetsThisWeek', { count: insight.count }) };
  }
}
