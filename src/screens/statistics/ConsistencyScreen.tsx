import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppHeader,
  AppText,
  Card,
  MetricCard,
  Screen,
  WeekConsistency,
  getWeekDayAccessibilityLabel,
} from '@/components';
import { TopicWorkspace } from '@/components/topics/TopicWorkspace';
import { useAppState } from '@/state';
import { colors, radius, space } from '@/theme';
import { getConsistencySummary } from '@/utils/consistency';

const WEEKDAY_LABEL_KEYS = {
  monday: 'calendar.weekdaysShort.monday',
  tuesday: 'calendar.weekdaysShort.tuesday',
  wednesday: 'calendar.weekdaysShort.wednesday',
  thursday: 'calendar.weekdaysShort.thursday',
  friday: 'calendar.weekdaysShort.friday',
  saturday: 'calendar.weekdaysShort.saturday',
  sunday: 'calendar.weekdaysShort.sunday',
} as const;

export function ConsistencyScreen() {
  const { t, i18n } = useTranslation();
  const { counterEvents, activeTopicId } = useAppState();
  const referenceDate = useMemo(() => new Date(), [activeTopicId, counterEvents, i18n.language]);
  const summary = useMemo(
    () => getConsistencySummary(counterEvents, referenceDate),
    [activeTopicId, counterEvents, referenceDate],
  );

  const weekDays = useMemo(
    () =>
      summary.weekDays.map((day) => {
        const label = t(WEEKDAY_LABEL_KEYS[day.weekday]);
        return {
          key: day.key,
          label,
          state: day.state,
          accessibilityLabel: getWeekDayAccessibilityLabel(t, label, day.state),
        };
      }),
    [summary.weekDays, t],
  );

  const streakLabel = t('consistency.day', { count: summary.currentStreak });
  const bestLabel = t('consistency.day', { count: summary.bestStreak });
  const heroMessage =
    summary.currentStreak === 0 ? t('consistency.startToday') : t('consistency.keepGoing');

  return (
    <Screen
      scroll
      constrained
      maxWidth={520}
      backgroundColor={colors.background}
    >
      <AppHeader title={t('consistency.title')} align="center" />
      <TopicWorkspace variant="compact" />

      <View
        style={styles.block}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${t('consistency.currentStreak')}, ${streakLabel}`}
      >
        <Card variant="soft" style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={summary.currentStreak > 0 ? 'flame' : 'flame-outline'}
              size={28}
              color={colors.warning}
            />
          </View>
          <AppText variant="caption" color="textSecondary">
            {t('consistency.currentStreak')}
          </AppText>
          <AppText variant="displayNumber">{summary.currentStreak}</AppText>
          <AppText variant="label" color="textSecondary">
            {streakLabel}
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.heroMessage}>
            {heroMessage}
          </AppText>
        </Card>
      </View>

      <View
        style={styles.block}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${t('consistency.bestStreak')}, ${bestLabel}`}
      >
        <MetricCard
          title={t('consistency.bestStreak')}
          value={bestLabel}
          footer={
            <View style={styles.bestFooter}>
              <Ionicons name="trophy-outline" size={20} color={colors.warning} />
            </View>
          }
        />
      </View>

      <Card variant="default" style={styles.weekCard}>
        <View style={styles.weekHeader}>
          <View style={styles.weekIcon}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.weekCopy}>
            <AppText variant="label" color="textSecondary">
              {t('consistency.thisWeek')}
            </AppText>
            <AppText variant="h3">{t('consistency.activeDays', { count: summary.activeDaysThisWeek })}</AppText>
          </View>
        </View>
        <WeekConsistency days={weekDays} />
      </Card>

      <AppText variant="body" color="textSecondary" align="center" style={styles.supporting}>
        {summary.currentStreak === 0 ? t('consistency.noStreak') : t('consistency.supporting')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
  },
  hero: {
    marginTop: space[4],
    marginBottom: space[3],
    alignItems: 'center',
    gap: space[1],
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningSoft,
    marginBottom: space[1],
  },
  heroMessage: {
    marginTop: space[2],
  },
  bestFooter: {
    marginTop: space[3],
  },
  weekCard: {
    marginTop: space[3],
    gap: space[4],
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  weekIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  weekCopy: {
    flex: 1,
    minWidth: 0,
    gap: space[1],
  },
  supporting: {
    marginTop: space[5],
  },
});
