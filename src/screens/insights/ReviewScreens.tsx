import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Group, Header, Screen, Section, Text, TrackerIcon } from '@/components';
import { activeTrackers, monthlyReview, weeklyReview, type ReviewLine, type Tracker } from '@/domain';
import { formatMonth, formatMonthYear, formatNumber, formatPercent, formatRange, formatShortDate, weekdayName } from '@/format';
import { trackEvent } from '@/lib/telemetry/analytics';
import type { RootScreenProps } from '@/navigation/types';
import { usePro } from '@/pro/ProProvider';
import { usePreferences, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

import { useAnalysisContext } from '../shared/useAnalysisContext';

function Metric({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
      <Text variant="numberMetric">{value}</Text>
      <Text variant="caption" tone="inkSecondary">
        {label}
      </Text>
    </View>
  );
}

function TrackerLine({ tracker, text }: { tracker: Tracker; text: string }) {
  return (
    <View style={styles.line} accessible accessibilityLabel={`${tracker.name}: ${text}`}>
      <TrackerIcon icon={tracker.icon} color={tracker.color} size={36} />
      <View style={styles.lineCopy}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {tracker.name}
        </Text>
        <Text variant="caption" tone="inkSecondary">
          {text}
        </Text>
      </View>
    </View>
  );
}

function weeklyLineText(line: ReviewLine, t: ReturnType<typeof useTranslation>['t'], locale: string): string {
  const n = (value: number) => formatNumber(value, locale);
  switch (line.kind) {
    case 'dailyTarget':
      return t('review.dailyTarget', { success: line.success, days: line.days });
    case 'dailyLimit':
      return t('review.dailyLimit', { success: line.success, days: line.days });
    case 'periodTarget':
      return line.met
        ? t('review.periodTargetMet', { total: n(line.total), target: n(line.target) })
        : t('review.periodTargetMissed', { total: n(line.total), target: n(line.target) });
    case 'periodLimit':
      return line.met
        ? t('review.periodLimitMet', { total: n(line.total), limit: n(line.limit) })
        : t('review.periodLimitMissed', { total: n(line.total), limit: n(line.limit) });
    case 'rhythm':
      return line.met
        ? t('review.rhythmMet', { active: line.activeDays, target: line.target })
        : t('review.rhythmMissed', { active: line.activeDays, target: line.target });
    case 'change':
      if (line.ratio === null) {
        return t('review.changeNew', { total: n(line.total) });
      }
      if (Math.abs(line.ratio) < 0.03) {
        return t('review.changeSame', { total: n(line.total) });
      }
      return line.ratio > 0
        ? t('review.changeUp', { total: n(line.total), percent: formatPercent(line.ratio, locale) })
        : t('review.changeDown', { total: n(line.total), percent: formatPercent(line.ratio, locale) });
  }
}

function useProGate(navigation: RootScreenProps<'WeeklyReview'>['navigation'] | RootScreenProps<'MonthlyReview'>['navigation'], feature: 'weeklyReview' | 'monthlyReview') {
  const pro = usePro();
  useEffect(() => {
    if (pro.hydrated && !pro.isPro) {
      navigation.replace('Paywall', { feature });
    }
  }, [feature, navigation, pro.hydrated, pro.isPro]);
  return pro.isPro;
}

export function WeeklyReviewScreen({ navigation }: RootScreenProps<'WeeklyReview'>) {
  const { t } = useTranslation();
  const { language } = usePreferences();
  const store = useTrackerStore();
  const context = useAnalysisContext();
  const allowed = useProGate(navigation, 'weeklyReview');
  const trackers = useMemo(() => activeTrackers(store.trackers), [store.trackers]);
  const review = useMemo(() => weeklyReview(trackers, store.events, context), [context, store.events, trackers]);

  useEffect(() => {
    void trackEvent('review_viewed', { kind: 'weekly' });
  }, []);

  if (!allowed) {
    return null;
  }
  const byId = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const patternTracker = review.pattern ? byId.get(review.pattern.trackerId) : null;
  const nextTracker = review.next ? byId.get(review.next.trackerId) : null;

  return (
    <Screen>
      <Header title={t('review.weeklyTitle')} subtitle={formatRange(review.range.start, review.range.end, language, context.now)} />
      {!review.available ? (
        <Text variant="body" tone="inkSecondary" style={styles.unavailable}>
          {t('review.unavailableWeek')}
        </Text>
      ) : (
        <>
          <View style={styles.metrics}>
            <Metric value={formatNumber(review.targetsReached, language)} label={t('review.targetsLabel')} />
            <Metric value={`${review.activeDays}/7`} label={t('review.activeDaysLabel')} />
          </View>
          <Section title={t('review.byTracker')}>
            <Group inset={64}>
              {review.lines.map((line) => {
                const tracker = byId.get(line.trackerId);
                return tracker ? <TrackerLine key={line.trackerId} tracker={tracker} text={weeklyLineText(line, t, language)} /> : null;
              })}
            </Group>
          </Section>
          {review.pattern && patternTracker ? (
            <Section title={t('review.pattern', { name: patternTracker.name })}>
              <Text variant="body">
                {review.pattern.weekdays.map((weekday) => weekdayName(weekday, language, 'long')).join(', ')}
              </Text>
            </Section>
          ) : null}
          {review.next && nextTracker ? (
            <Section title={t('review.next')}>
              <Text variant="body">
                {t('review.nextPerDay', { count: formatNumber(review.next.perDay, language), name: nextTracker.name })}
              </Text>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

export function MonthlyReviewScreen({ navigation }: RootScreenProps<'MonthlyReview'>) {
  const { t } = useTranslation();
  const { language } = usePreferences();
  const store = useTrackerStore();
  const context = useAnalysisContext();
  const allowed = useProGate(navigation, 'monthlyReview');
  const trackers = useMemo(() => activeTrackers(store.trackers), [store.trackers]);
  const review = useMemo(() => monthlyReview(trackers, store.events, context), [context, store.events, trackers]);

  useEffect(() => {
    void trackEvent('review_viewed', { kind: 'monthly' });
  }, []);

  if (!allowed) {
    return null;
  }
  const byId = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const previousMonth = new Date(review.range.start.getFullYear(), review.range.start.getMonth() - 1, 1);

  return (
    <Screen>
      <Header title={t('review.monthlyTitle')} subtitle={formatMonthYear(review.range.start, language)} />
      {!review.available ? (
        <Text variant="body" tone="inkSecondary" style={styles.unavailable}>
          {t('review.unavailableMonth')}
        </Text>
      ) : (
        <>
          <View style={styles.metrics}>
            <Metric value={formatNumber(review.targetsReached, language)} label={t('review.targetsLabel')} />
            <Metric value={`${review.activeDays}/${review.days}`} label={t('review.activeDaysLabel')} />
          </View>
          {review.lines.map((line) => {
            const tracker = byId.get(line.trackerId);
            if (!tracker) {
              return null;
            }
            const facts = [
              line.ratio === null
                ? formatNumber(line.total, language)
                : `${formatNumber(line.total, language)} · ${line.ratio >= 0 ? '↑' : '↓'} ${formatPercent(line.ratio, language)} ${t('review.vsPrevious', { month: formatMonth(previousMonth, language) })}`,
              line.direction ? t(`review.direction.${line.direction}`) : null,
              line.successRate ? t(`review.successRate.${line.successRate.rule}`, { success: line.successRate.success, days: line.successRate.days }) : null,
              line.bestWeek
                ? t('review.bestWeek', { total: formatNumber(line.bestWeek.total, language), date: formatShortDate(line.bestWeek.start, language, context.now) })
                : null,
            ].filter((fact): fact is string => Boolean(fact));
            return (
              <Section key={line.trackerId}>
                <Group>
                  <TrackerLine tracker={tracker} text={facts.join('\n')} />
                </Group>
              </Section>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  unavailable: {
    marginTop: 24,
  },
  metrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  metric: {
    flex: 1,
    padding: 16,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
  },
  lineCopy: {
    flex: 1,
    minWidth: 0,
  },
});
