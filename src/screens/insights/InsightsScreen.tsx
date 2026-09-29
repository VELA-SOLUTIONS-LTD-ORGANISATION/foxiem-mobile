import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DayDots, EmptyState, Group, Header, InsightRow, Screen, Section, Text, TrackerIcon } from '@/components';
import { FOXIEM_HOME_IMAGE } from '@/constants/brand';
import {
  activeTrackers,
  daysBetween,
  globalInsights,
  periodRange,
  shiftedPeriodRange,
  trackerInsights,
  trackerSnapshot,
  trackerStartDay,
  type Insight,
} from '@/domain';
import { formatMonth, formatNumber, formatRange, weekSummaryLine } from '@/format';
import type { TabScreenProps } from '@/navigation/types';
import { useFeature } from '@/pro/useFeature';
import { usePreferences, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

import { insightCopy } from '../shared/insightCopy';
import { useAnalysisContext } from '../shared/useAnalysisContext';

export function InsightsScreen({ navigation }: TabScreenProps<'InsightsTab'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { language } = usePreferences();
  const store = useTrackerStore();
  const context = useAnalysisContext();
  const weekly = useFeature('weeklyReview');
  const monthly = useFeature('monthlyReview');
  const patterns = useFeature('crossTracker');

  const trackers = useMemo(() => activeTrackers(store.trackers), [store.trackers]);
  const week = periodRange('week', context.now, context.weekStart);
  const lastWeek = shiftedPeriodRange('week', context.now, -1, context.weekStart);
  const lastMonth = shiftedPeriodRange('month', context.now, -1, context.weekStart);

  const age = useMemo(() => {
    if (trackers.length === 0) {
      return 0;
    }
    const earliest = Math.min(...trackers.map((tracker) => trackerStartDay(tracker, store.events[tracker.id] ?? []).getTime()));
    return daysBetween(new Date(earliest), context.now) + 1;
  }, [context.now, store.events, trackers]);

  const global = useMemo(() => globalInsights(trackers, store.events, context), [context, store.events, trackers]);
  const highlights = useMemo(() => {
    const perTracker: Insight[] = trackers.flatMap((tracker) => {
      const dailyGoal = tracker.period === 'day' && (tracker.intent === 'reach' || tracker.intent === 'limit');
      // Daily goals read better as a hit rate; hour-by-hour comparisons would be noise here.
      return trackerInsights(tracker, store.events[tracker.id] ?? [], context).filter(
        (insight) =>
          insight.tier === 'free' &&
          ((insight.kind === 'comparison' && !dailyGoal && insight.comparison.period !== 'day') || insight.kind === 'hitRate'),
      );
    });
    return [...global.filter((insight) => insight.tier === 'free'), ...perTracker]
      .map((insight) => insightCopy(insight, trackers, t, language, context.now))
      .filter((copy): copy is NonNullable<typeof copy> => copy !== null)
      .slice(0, 6);
  }, [context, global, language, store.events, t, trackers]);

  const crossRows = useMemo(
    () =>
      global
        .filter((insight) => insight.kind === 'crossTracker')
        .map((insight) => insightCopy(insight, trackers, t, language, context.now))
        .filter((copy): copy is NonNullable<typeof copy> => copy !== null),
    [context.now, global, language, t, trackers],
  );

  if (trackers.length === 0) {
    return (
      <Screen>
        <Header large title={t('insights.title')} />
        <EmptyState
          image={FOXIEM_HOME_IMAGE}
          title={t('insights.emptyTitle')}
          body={t('insights.emptyBody')}
          action={{ label: t('insights.emptyCta'), onPress: () => navigation.navigate('CreateTracker') }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header large title={t('insights.title')} subtitle={t('insights.weekRange', { range: formatRange(week.start, week.end, language, context.now) })} />

      {age < 7 ? (
        <View style={[styles.early, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
          <Text variant="bodyStrong">{t('insights.earlyTitle')}</Text>
          <Text variant="caption" tone="inkSecondary" style={styles.earlyBody}>
            {t('insights.earlyBody')}
          </Text>
        </View>
      ) : null}

      <Section title={t('insights.thisWeek')} style={styles.firstSection}>
        <Group inset={66}>
          {trackers.map((tracker) => {
            const events = store.events[tracker.id] ?? [];
            const snapshot = trackerSnapshot(tracker, events, context);
            const line = weekSummaryLine(tracker, snapshot, t, language);
            return (
              <Pressable
                key={tracker.id}
                accessibilityRole="button"
                accessibilityLabel={`${tracker.name}, ${line}`}
                onPress={() => navigation.navigate('TrackerDetail', { trackerId: tracker.id })}
                style={({ pressed }) => [styles.weekRow, pressed && { backgroundColor: theme.colors.sunken }]}
              >
                <TrackerIcon icon={tracker.icon} color={tracker.color} />
                <View style={styles.weekCopy}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {tracker.name}
                  </Text>
                  <Text variant="caption" tone="inkSecondary" numberOfLines={2}>
                    {line}
                  </Text>
                </View>
                <View style={styles.weekValue}>
                  <Text variant="numberSmall">
                    {formatNumber(snapshot.week.reduce((sum, day) => sum + Math.max(0, day.value), 0), language)}
                  </Text>
                  <DayDots days={snapshot.week} color={tracker.color} locale={language} size={7} />
                </View>
              </Pressable>
            );
          })}
        </Group>
      </Section>

      <Section title={t('insights.highlights')}>
        <Group inset={60}>
          {highlights.length === 0 ? <InsightRow icon="hourglass-outline" text={t('insights.noHighlights')} /> : null}
          {highlights.map((row) => (
            <InsightRow key={row.text} icon={row.icon} text={row.text} />
          ))}
        </Group>
      </Section>

      {weekly.visible ? (
        <Section title={t('insights.reviews')}>
          <Group inset={60}>
            <InsightRow
              icon="reader-outline"
              text={t('insights.weeklyReview')}
              detail={t('insights.weeklyReviewBody', { range: formatRange(lastWeek.start, lastWeek.end, language, context.now) })}
              locked={!weekly.allowed}
              onPress={weekly.allowed ? () => navigation.navigate('WeeklyReview') : weekly.request}
            />
            <InsightRow
              icon="albums-outline"
              text={t('insights.monthlyReview')}
              detail={t('insights.monthlyReviewBody', { month: formatMonth(lastMonth.start, language) })}
              locked={!monthly.allowed}
              onPress={monthly.allowed ? () => navigation.navigate('MonthlyReview') : monthly.request}
            />
          </Group>
        </Section>
      ) : null}

      {patterns.visible ? (
        <Section title={t('insights.patterns')}>
          <Group inset={60}>
            {!patterns.allowed ? (
              <InsightRow icon="git-compare-outline" text={t('insights.patternsLocked')} locked onPress={patterns.request} />
            ) : crossRows.length > 0 ? (
              crossRows.map((row) => <InsightRow key={row.text} icon={row.icon} text={row.text} />)
            ) : (
              <InsightRow icon="hourglass-outline" text={t('insights.noPatterns')} />
            )}
          </Group>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  early: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  earlyBody: {
    marginTop: 4,
  },
  firstSection: {
    marginTop: 20,
  },
  weekRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  weekCopy: {
    flex: 1,
    minWidth: 0,
  },
  weekValue: {
    alignItems: 'flex-end',
    gap: 6,
  },
});
