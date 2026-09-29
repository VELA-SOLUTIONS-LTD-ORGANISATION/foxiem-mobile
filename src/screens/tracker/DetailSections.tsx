import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  CalendarLockedRow,
  Group,
  InsightRow,
  MonthCalendar,
  Section,
  Text,
  WeekBars,
} from '@/components';
import {
  completedPeriodTotals,
  consistencySummary,
  streakSummary,
  type Context,
  type DayCell,
  type TrackerSnapshot,
} from '@/domain/analysis';
import { patternReadiness, trackerInsights } from '@/domain/insights';
import { startOfMonth } from '@/domain/periods';
import type { CountEvent, Tracker } from '@/domain/types';
import { consistencyText, formatLongDate, formatNumber, formatPercent, formatShortDate, streakText } from '@/format';
import { FREE_CALENDAR_MONTHS_BACK } from '@/pro/features';
import { useFeature } from '@/pro/useFeature';
import { useTheme } from '@/theme';

import { insightCopy } from '../shared/insightCopy';

type SectionProps = {
  tracker: Tracker;
  events: readonly CountEvent[];
  context: Context;
  locale: string;
};

export function WeekSection({ tracker, snapshot, locale }: { tracker: Tracker; snapshot: TrackerSnapshot; locale: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const line =
    tracker.period === 'day' && tracker.target && (tracker.intent === 'reach' || tracker.intent === 'limit')
      ? { value: tracker.target, kind: tracker.intent === 'reach' ? ('target' as const) : ('limit' as const) }
      : null;
  return (
    <Section title={t('detail.thisWeek')}>
      <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
        <WeekBars days={snapshot.week} color={tracker.color} locale={locale} line={line} />
      </View>
    </Section>
  );
}

export function ConsistencySection({ tracker, events, context, locale: language }: SectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const summary = useMemo(() => consistencySummary(tracker, events, context), [context, events, tracker]);
  const streak = useMemo(() => streakSummary(tracker, events, context), [context, events, tracker]);
  if (!summary) {
    return null;
  }
  return (
    <Section title={t('detail.consistency')}>
      <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
        {summary.kind === 'insufficient' ? (
          <Text variant="body" tone="inkSecondary">
            {t('detail.consistencySoon', { count: summary.daysNeeded })}
          </Text>
        ) : (
          <View style={styles.consistency}>
            <View style={styles.consistencyMain}>
              <Text variant="numberMetric" style={styles.bigMetric}>
                {formatPercent(summary.rate, language)}
              </Text>
              <View style={styles.consistencyCopy}>
                <Text variant="bodyStrong">{consistencyText(summary, t)}</Text>
                <Text variant="caption" tone="inkTertiary">
                  {summary.kind === 'periods'
                    ? t(`detail.consistencyRulePeriod.${summary.period}.${summary.rule}`)
                    : t(`detail.consistencyRule.${summary.rule}`)}
                </Text>
              </View>
            </View>
            {streak ? (
              <View style={[styles.streaks, { borderTopColor: theme.colors.line }]}>
                <View style={styles.streak}>
                  <Text variant="caption" tone="inkSecondary">
                    {t('detail.streak')}
                  </Text>
                  <Text variant="bodyStrong">{streakText(streak, streak.current, t)}</Text>
                </View>
                <View style={styles.streak}>
                  <Text variant="caption" tone="inkSecondary">
                    {t('detail.bestStreak')}
                  </Text>
                  <Text variant="bodyStrong">{streakText(streak, streak.best, t)}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Section>
  );
}

export function CalendarSection({ tracker, events, context, locale: language, onYear }: SectionProps & { onYear?: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullHistory = useFeature('fullHistory');
  const current = startOfMonth(context.now);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<DayCell | null>(null);
  const month = new Date(current.getFullYear(), current.getMonth() + offset, 1);
  const trackerStart = startOfMonth(new Date(Math.min(Date.parse(tracker.createdAt), events[0] ? Date.parse(events[0].createdAt) : Infinity)));
  const earliestOffset = (trackerStart.getFullYear() - current.getFullYear()) * 12 + (trackerStart.getMonth() - current.getMonth());
  const freeFloor = -FREE_CALENDAR_MONTHS_BACK;
  const floor = fullHistory.allowed ? earliestOffset : Math.max(earliestOffset, freeFloor);
  const canGoBack = offset > floor;
  const lockedEarlier = !fullHistory.allowed && fullHistory.visible && earliestOffset < freeFloor && offset === freeFloor;

  return (
    <Section title={t('detail.calendar')}>
      <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
        <MonthCalendar
          tracker={tracker}
          events={events}
          month={month}
          context={context}
          locale={language}
          selectedKey={selected?.key ?? null}
          onSelect={setSelected}
          onPrevious={canGoBack ? () => setOffset((value) => value - 1) : null}
          onNext={offset < 0 ? () => setOffset((value) => value + 1) : null}
          footer={
            <>
              {selected ? (
                <Text variant="bodyStrong" style={styles.selected} accessibilityLiveRegion="polite">
                  {`${formatLongDate(selected.date, language, context.now)} · ${formatNumber(Math.max(0, selected.value), language)}`}
                </Text>
              ) : null}
              {lockedEarlier ? <CalendarLockedRow label={t('calendar.moreWithPro')} onPress={fullHistory.request} /> : null}
              {fullHistory.allowed && onYear ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onYear}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.yearLink,
                    { borderColor: theme.colors.line, borderRadius: theme.radius.md, backgroundColor: pressed ? theme.colors.sunken : 'transparent' },
                  ]}
                >
                  <Ionicons name="grid-outline" size={16} color={theme.colors.ink} />
                  <Text variant="label">{t('calendar.year')}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.inkTertiary} />
                </Pressable>
              ) : null}
            </>
          }
        />
      </View>
    </Section>
  );
}

export function TrendSection({ tracker, events, context, locale: language }: SectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const trends = useFeature('trends');
  const weeks = useMemo(() => completedPeriodTotals(tracker, events, 'week', 12, context), [context, events, tracker]);
  if (!trends.visible) {
    return null;
  }
  if (!trends.allowed) {
    return (
      <Section title={t('pro.features.trends.title')}>
        <Group>
          <InsightRow icon="trending-up-outline" text={t('pro.features.trends.body')} locked onPress={trends.request} />
        </Group>
      </Section>
    );
  }
  const existed = weeks.filter((week) => week.existed);
  if (existed.length < 4) {
    return null;
  }
  const max = Math.max(1, ...existed.map((week) => week.total));
  return (
    <Section title={t('pro.features.trends.title')}>
      <View
        accessible
        accessibilityLabel={existed.map((week) => `${formatShortDate(week.start, language, context.now)} ${formatNumber(week.total, language)}`).join(', ')}
        style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}
      >
        <View style={styles.trend}>
          {existed.map((week) => (
            <View key={week.start.toISOString()} style={styles.trendColumn}>
              <View
                style={[
                  styles.trendBar,
                  {
                    height: Math.max(3, (week.total / max) * 96),
                    backgroundColor: theme.tone(tracker.color).solid,
                    borderRadius: theme.radius.xs,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.trendLabels}>
          <Text variant="micro" tone="inkTertiary">
            {formatShortDate(existed[0]!.start, language, context.now)}
          </Text>
          <Text variant="micro" tone="inkTertiary">
            {formatShortDate(existed[existed.length - 1]!.start, language, context.now)}
          </Text>
        </View>
      </View>
    </Section>
  );
}

export function InsightsSection({ tracker, events, context, locale: language, trackers }: SectionProps & { trackers: readonly Tracker[] }) {
  const { t } = useTranslation();
  const patterns = useFeature('patterns');
  const pace = useFeature('pace');
  const insights = useMemo(() => trackerInsights(tracker, events, context), [context, events, tracker]);
  const readiness = useMemo(() => patternReadiness(tracker, events, context), [context, events, tracker]);

  const free = insights.filter((insight) => insight.tier === 'free');
  const pro = insights.filter((insight) => insight.tier === 'pro');
  const rows = (patterns.allowed ? [...free, ...pro] : free)
    .map((insight) => insightCopy(insight, trackers, t, language, context.now))
    .filter((copy): copy is NonNullable<typeof copy> => copy !== null);

  const showPaceTeaser = pace.visible && !pace.allowed && tracker.intent === 'reach' && tracker.period !== 'day';
  const showPatternTeaser = patterns.visible && !patterns.allowed;

  return (
    <Section title={t('detail.insights')}>
      <Group inset={60}>
        {rows.length === 0 ? <InsightRow icon="hourglass-outline" text={t('detail.insightsEmpty')} /> : null}
        {rows.map((row) => (
          <InsightRow key={row.text} icon={row.icon} text={row.text} />
        ))}
        {patterns.allowed && !readiness.ready ? (
          <InsightRow icon="pulse-outline" text={t('insight.patternsSoon', { count: readiness.daysNeeded })} />
        ) : null}
        {showPaceTeaser ? (
          <InsightRow icon="speedometer-outline" text={t('pro.features.pace.body')} locked onPress={pace.request} />
        ) : null}
        {showPatternTeaser ? (
          <InsightRow icon="pulse-outline" text={t('pro.features.patterns.body')} locked onPress={patterns.request} />
        ) : null}
      </Group>
    </Section>
  );
}

/** Reduce is about direction: this period so far, the last full period and where the user started. */
export function ReduceStrip({
  tracker,
  events,
  context,
  locale: language,
  samePoint,
}: SectionProps & { samePoint: number | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const period = tracker.period === 'all' ? 'week' : tracker.period;
  const last = useMemo(() => completedPeriodTotals(tracker, events, period, 1, context)[0], [context, events, period, tracker]);
  const cells = [
    { key: 'point', label: t(`detail.reduce.samePoint.${period}`), value: samePoint === null ? '—' : formatNumber(samePoint, language) },
    { key: 'last', label: t(`detail.reduce.last.${period}`), value: last?.existed ? formatNumber(last.total, language) : '—' },
    ...(tracker.baseline !== null ? [{ key: 'usual', label: t('detail.reduce.usual'), value: formatNumber(tracker.baseline, language) }] : []),
  ];
  return (
    <View style={[styles.strip, { borderColor: theme.colors.line, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface }]}>
      {cells.map((cell, index) => (
        <View
          key={cell.key}
          accessible
          accessibilityLabel={`${cell.label}: ${cell.value}`}
          style={[styles.stripCell, index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.colors.line }]}
        >
          <Text variant="numberMetric">{cell.value}</Text>
          <Text variant="micro" tone="inkSecondary" align="center" numberOfLines={2}>
            {cell.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function NotesSection({ notes }: { notes: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (!notes.trim()) {
    return null;
  }
  return (
    <Section title={t('trackerSettings.notes')}>
      <View style={[styles.panel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
        <Text variant="body">{notes}</Text>
      </View>
    </Section>
  );
}

export function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && { backgroundColor: theme.colors.sunken }]}
    >
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  consistency: {
    gap: 14,
  },
  consistencyMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bigMetric: {
    fontSize: 34,
    lineHeight: 38,
  },
  consistencyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  streaks: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 16,
  },
  streak: {
    flex: 1,
    gap: 2,
  },
  selected: {
    marginTop: 12,
  },
  yearLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trend: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  trendColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '100%',
    maxWidth: 22,
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  link: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  strip: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 2,
  },
});
