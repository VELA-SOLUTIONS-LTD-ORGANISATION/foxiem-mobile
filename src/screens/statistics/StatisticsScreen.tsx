import { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AdBanner } from '@/ads';
import {
  AppHeader,
  AppText,
  Card,
  Screen,
  SegmentedControl,
  SettingsRow,
  WeekConsistency,
  getWeekDayAccessibilityLabel,
} from '@/components';
import { TopicWorkspace } from '@/components/topics/TopicWorkspace';
import type { MainTabScreenProps } from '@/navigation/types';
import { useAppState } from '@/state';
import { colors, radius, shadows, space } from '@/theme';
import { getConsistencySummary } from '@/utils/consistency';
import { formatLocaleNumber } from '@/utils/number';
import {
  getDayBuckets,
  getMonthActivity,
  getMonthBuckets,
  getTodayActivity,
  getWeekActivity,
  getWeekBuckets,
  getYearBuckets,
  type StatisticBucket,
} from '@/utils/statistics';

type Period = 'day' | 'week' | 'month' | 'year';

type ChartItem = {
  key: string;
  label: string;
  value: number;
};

const STATISTICS_MAX_WIDTH = 520;

const WEEKDAY_LABEL_KEYS = {
  monday: 'calendar.weekdaysShort.monday',
  tuesday: 'calendar.weekdaysShort.tuesday',
  wednesday: 'calendar.weekdaysShort.wednesday',
  thursday: 'calendar.weekdaysShort.thursday',
  friday: 'calendar.weekdaysShort.friday',
  saturday: 'calendar.weekdaysShort.saturday',
  sunday: 'calendar.weekdaysShort.sunday',
} as const;

const MONTH_LABEL_KEYS = {
  january: 'calendar.monthsShort.january',
  february: 'calendar.monthsShort.february',
  march: 'calendar.monthsShort.march',
  april: 'calendar.monthsShort.april',
  may: 'calendar.monthsShort.may',
  june: 'calendar.monthsShort.june',
  july: 'calendar.monthsShort.july',
  august: 'calendar.monthsShort.august',
  september: 'calendar.monthsShort.september',
  october: 'calendar.monthsShort.october',
  november: 'calendar.monthsShort.november',
  december: 'calendar.monthsShort.december',
} as const;

const WEEK_NUMBER_KEYS = {
  w1: 'statistics.weekNumber.w1',
  w2: 'statistics.weekNumber.w2',
  w3: 'statistics.weekNumber.w3',
  w4: 'statistics.weekNumber.w4',
  w5: 'statistics.weekNumber.w5',
  w6: 'statistics.weekNumber.w6',
} as const;

function labelForBucket(
  period: Period,
  bucket: StatisticBucket,
  translate: TFunction,
): string {
  if (period === 'day') {
    return bucket.key;
  }

  if (period === 'week' && bucket.key in WEEKDAY_LABEL_KEYS) {
    return translate(WEEKDAY_LABEL_KEYS[bucket.key as keyof typeof WEEKDAY_LABEL_KEYS]);
  }

  if (period === 'month' && bucket.key in WEEK_NUMBER_KEYS) {
    return translate(WEEK_NUMBER_KEYS[bucket.key as keyof typeof WEEK_NUMBER_KEYS]);
  }

  if (period === 'year' && bucket.key in MONTH_LABEL_KEYS) {
    return translate(MONTH_LABEL_KEYS[bucket.key as keyof typeof MONTH_LABEL_KEYS]);
  }

  return bucket.key;
}

type Props = MainTabScreenProps<'StatisticsTab'>;

export function StatisticsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { counter, counterEvents, activeTopicId } = useAppState();
  const [period, setPeriod] = useState<Period>('week');
  const referenceDate = useMemo(() => new Date(), [activeTopicId, counterEvents]);

  const periodOptions = useMemo(
    () =>
      [
        { label: t('statistics.day'), value: 'day' },
        { label: t('statistics.week'), value: 'week' },
        { label: t('statistics.month'), value: 'month' },
        { label: t('statistics.year'), value: 'year' },
      ] as const,
    [t],
  );

  const todayActivity = useMemo(
    () => getTodayActivity(counterEvents, referenceDate),
    [activeTopicId, counterEvents, referenceDate],
  );
  const weekActivity = useMemo(
    () => getWeekActivity(counterEvents, referenceDate),
    [activeTopicId, counterEvents, referenceDate],
  );
  const monthActivity = useMemo(
    () => getMonthActivity(counterEvents, referenceDate),
    [activeTopicId, counterEvents, referenceDate],
  );

  const chartData = useMemo<ChartItem[]>(() => {
    const buckets =
      period === 'day'
        ? getDayBuckets(counterEvents, referenceDate)
        : period === 'week'
          ? getWeekBuckets(counterEvents, referenceDate)
          : period === 'month'
            ? getMonthBuckets(counterEvents, referenceDate)
            : getYearBuckets(counterEvents, referenceDate);

    return buckets.map((bucket) => ({
      key: bucket.key,
      label: labelForBucket(period, bucket, t),
      value: bucket.value,
    }));
  }, [activeTopicId, counterEvents, period, referenceDate, t]);

  const chartScale = useMemo(() => {
    const maxPositive = Math.max(0, ...chartData.map((item) => item.value));
    const maxNegative = Math.max(0, ...chartData.map((item) => -item.value));
    return {
      maxPositive,
      maxNegative,
    };
  }, [chartData]);

  const consistency = useMemo(
    () => getConsistencySummary(counterEvents, referenceDate),
    [activeTopicId, counterEvents, referenceDate],
  );

  const weekConsistencyDays = useMemo(
    () =>
      consistency.weekDays.map((day) => {
        const label = t(WEEKDAY_LABEL_KEYS[day.weekday]);
        return {
          key: day.key,
          label,
          state: day.state,
          accessibilityLabel: getWeekDayAccessibilityLabel(t, label, day.state),
        };
      }),
    [consistency.weekDays, t],
  );

  const highlightedKey = useMemo(() => {
    const positiveItems = chartData.filter((item) => item.value > 0);
    if (positiveItems.length === 0) {
      return null;
    }

    return positiveItems.reduce((highest, current) =>
      current.value > highest.value ? current : highest,
    ).key;
  }, [chartData]);

  const summary = [
    {
      id: 'today',
      title: t('statistics.today'),
      value: formatLocaleNumber(todayActivity, i18n.language),
      icon: 'calendar-outline',
      iconColor: colors.secondary,
      iconBackground: colors.secondarySoft,
    },
    {
      id: 'week',
      title: t('statistics.thisWeek'),
      value: formatLocaleNumber(weekActivity, i18n.language),
      icon: 'bar-chart-outline',
      iconColor: colors.success,
      iconBackground: colors.successSoft,
    },
    {
      id: 'month',
      title: t('statistics.thisMonth'),
      value: formatLocaleNumber(monthActivity, i18n.language),
      icon: 'trending-up-outline',
      iconColor: colors.primary,
      iconBackground: colors.primarySoft,
    },
    {
      id: 'total',
      title: t('statistics.total'),
      value: formatLocaleNumber(counter.currentCount, i18n.language),
      icon: 'trophy-outline',
      iconColor: colors.warning,
      iconBackground: colors.warningSoft,
    },
  ] as const;

  return (
    <Screen
      scroll
      constrained
      maxWidth={STATISTICS_MAX_WIDTH}
      backgroundColor={colors.background}
      edges={['top', 'left', 'right']}
      contentStyle={styles.screenFill}
      scrollContentStyle={styles.scrollFill}
    >
      <View style={styles.container}>
        <AppHeader
          title={t('statistics.title')}
          subtitle={t('statistics.subtitle')}
          showBack={false}
          align="center"
        />

        <TopicWorkspace variant="compact" />

        <SegmentedControl options={[...periodOptions]} value={period} onChange={setPeriod} />

        <Card variant="default" style={styles.chartCard}>
          <ActivityBarChart
            data={chartData}
            maxPositive={chartScale.maxPositive}
            maxNegative={chartScale.maxNegative}
            highlightedKey={highlightedKey}
            accessibilityLabel={t('statistics.chartLabel')}
            locale={i18n.language}
          />
        </Card>

        <View style={styles.summaryGrid}>
          {summary.map((item) => (
            <View key={item.id} style={styles.summaryCardWrap}>
              <SummaryCard
                title={item.title}
                value={item.value}
                icon={item.icon}
                iconColor={item.iconColor}
                iconBackground={item.iconBackground}
              />
            </View>
          ))}
        </View>

        <Card variant="default" style={styles.consistencyCard}>
          <AppText variant="h3">{t('consistency.title')}</AppText>
          <View style={styles.consistencyStats}>
            <View
              style={styles.consistencyStat}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${t('consistency.currentStreak')}, ${t('consistency.day', { count: consistency.currentStreak })}`}
            >
              <AppText variant="caption" color="textSecondary">
                {t('consistency.currentStreak')}
              </AppText>
              <AppText variant="label">
                {t('consistency.day', { count: consistency.currentStreak })}
              </AppText>
            </View>
            <View
              style={styles.consistencyStat}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${t('consistency.thisWeek')}, ${t('consistency.activeDays', { count: consistency.activeDaysThisWeek })}`}
            >
              <AppText variant="caption" color="textSecondary">
                {t('consistency.thisWeek')}
              </AppText>
              <AppText variant="label">
                {t('consistency.weekRatio', { count: consistency.activeDaysThisWeek })}
              </AppText>
            </View>
          </View>
          <WeekConsistency days={weekConsistencyDays} />
          <Pressable
            role="button"
            accessibilityRole="button"
            accessibilityLabel={t('consistency.viewConsistency')}
            onPress={() => navigation.navigate('Consistency')}
            style={styles.consistencyAction}
          >
            <AppText variant="label" color="primary">
              {t('consistency.viewConsistency')}
            </AppText>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        </Card>

        <Card variant="default" style={styles.activityRow}>
          <SettingsRow
            title={t('statistics.viewActivity')}
            onPress={() => navigation.navigate('ActivityHistory')}
          />
        </Card>

        <AdBanner placement="statistics" />
      </View>
    </Screen>
  );
}

type ActivityBarChartProps = {
  data: ChartItem[];
  maxPositive: number;
  maxNegative: number;
  highlightedKey: string | null;
  accessibilityLabel: string;
  locale: string;
};

function ActivityBarChart({
  data,
  maxPositive,
  maxNegative,
  highlightedKey,
  accessibilityLabel,
  locale,
}: ActivityBarChartProps) {
  const positiveWeight = maxPositive > 0 ? maxPositive : maxNegative > 0 ? 0 : 1;
  const negativeWeight = maxNegative > 0 ? maxNegative : maxPositive > 0 ? 0 : 1;

  return (
    <View
      style={styles.chart}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${accessibilityLabel}. ${data
        .map((item) => `${item.label} ${formatLocaleNumber(item.value, locale)}`)
        .join(', ')}`}
    >
      <View style={styles.bars} importantForAccessibility="no-hide-descendants">
        {data.map((item) => {
          const highlighted = item.key === highlightedKey;
          const positiveFlex = item.value > 0 ? item.value : 0;
          const negativeFlex = item.value < 0 ? -item.value : 0;
          const positiveSpacer = Math.max(0, maxPositive - positiveFlex);
          const negativeSpacer = Math.max(0, maxNegative - negativeFlex);

          return (
            <View key={item.key} style={styles.barColumn}>
              <View style={styles.tooltipLane}>
                {highlighted ? (
                  <View style={styles.tooltip}>
                    <AppText variant="captionSmall" color="textPrimary" numberOfLines={1}>
                      {formatLocaleNumber(item.value, locale)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <View
                style={styles.plot}
              >
                <View style={[styles.positiveZone, { flex: positiveWeight }]}>
                  <View style={{ flex: Math.max(positiveSpacer, 0.0001) }} />
                  {positiveFlex > 0 ? (
                    <View
                      style={[
                        styles.bar,
                        styles.positiveBar,
                        { flex: positiveFlex },
                        highlighted && styles.highlightedBar,
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.zeroLine} />
                <View style={[styles.negativeZone, { flex: negativeWeight }]}>
                  {negativeFlex > 0 ? (
                    <View style={[styles.bar, styles.negativeBar, { flex: negativeFlex }]} />
                  ) : null}
                  <View style={{ flex: Math.max(negativeSpacer, 0.0001) }} />
                </View>
              </View>
              <AppText variant="captionSmall" color="textMuted" numberOfLines={1}>
                {item.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
};

function SummaryCard({
  title,
  value,
  icon,
  iconColor,
  iconBackground,
}: SummaryCardProps) {
  return (
    <Card variant="default" style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.summaryContent}>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="h2">{value}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screenFill: {
    flexGrow: 1,
  },
  scrollFill: {
    flexGrow: 1,
    paddingBottom: space[6],
  },
  container: {
    width: '100%',
    paddingTop: space[2],
    paddingBottom: space[4],
  },
  chartCard: {
    marginTop: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[2],
  },
  chart: {
    height: 220,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: space[2],
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
  },
  tooltipLane: {
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: space[1],
  },
  plot: {
    flex: 1,
    width: '100%',
    maxWidth: 34,
    alignItems: 'center',
  },
  positiveZone: {
    width: '100%',
    minHeight: 0,
  },
  negativeZone: {
    width: '100%',
    minHeight: 0,
  },
  zeroLine: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  bar: {
    width: '72%',
    minHeight: 4,
    alignSelf: 'center',
  },
  positiveBar: {
    borderTopStartRadius: radius.sm,
    borderTopEndRadius: radius.sm,
    backgroundColor: colors.secondarySoft,
  },
  negativeBar: {
    borderBottomStartRadius: radius.sm,
    borderBottomEndRadius: radius.sm,
    backgroundColor: colors.errorSoft,
  },
  highlightedBar: {
    backgroundColor: colors.primary,
  },
  tooltip: {
    paddingHorizontal: space[1],
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
    marginTop: space[3],
  },
  summaryCardWrap: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 145,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[3],
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: space[3],
  },
  summaryContent: {
    flex: 1,
    minWidth: 0,
  },
  consistencyCard: {
    marginTop: space[3],
    gap: space[3],
  },
  consistencyStats: {
    flexDirection: 'row',
    gap: space[3],
  },
  consistencyStat: {
    flex: 1,
    minWidth: 0,
    gap: space[1],
  },
  consistencyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityRow: {
    marginTop: space[3],
    paddingVertical: space[1],
    overflow: 'hidden',
  },
});
