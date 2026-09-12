import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AdBanner } from '@/ads';
import { AppHeader, AppText, Card, EmptyState, Screen } from '@/components';
import { useAppState, type CounterEvent, type CounterEventType } from '@/state';
import { colors, radius, space } from '@/theme';
import {
  formatHistoryDate,
  formatLocalTime,
  groupCounterEventsByLocalDate,
} from '@/utils/activityHistory';
import { parseTimestamp } from '@/utils/date';
import { formatLocaleNumber } from '@/utils/number';

export function ActivityHistoryScreen() {
  const { t, i18n } = useTranslation();
  const { counterEvents } = useAppState();
  const referenceDate = useMemo(() => new Date(), [counterEvents, i18n.language]);

  const sections = useMemo(
    () =>
      groupCounterEventsByLocalDate(counterEvents, referenceDate).map((section) => ({
        ...section,
        title:
          section.kind === 'today'
            ? t('activity.today')
            : section.kind === 'yesterday'
              ? t('activity.yesterday')
              : formatHistoryDate(section.date, referenceDate, i18n.language),
      })),
    [counterEvents, i18n.language, referenceDate, t],
  );

  return (
    <Screen
      constrained
      maxWidth={520}
      backgroundColor={colors.background}
      contentStyle={styles.screenFill}
    >
      <View style={styles.container}>
        <AppHeader title={t('activity.title')} subtitle={t('activity.subtitle')} align="center" />
        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            sections.length === 0 && styles.emptyContent,
          ]}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="time-outline" size={32} color={colors.textMuted} />}
              title={t('activity.empty.title')}
              body={t('activity.empty.body')}
            />
          }
          ListFooterComponent={
            sections.length > 0 ? (
              <AdBanner placement="activityHistory" />
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <AppText variant="h3">{section.title}</AppText>
            </View>
          )}
          renderItem={({ item }) => <ActivityHistoryRow event={item} />}
          ItemSeparatorComponent={() => <View style={styles.itemGap} />}
          SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        />
      </View>
    </Screen>
  );
}

function ActivityHistoryRow({ event }: { event: CounterEvent }) {
  const { t, i18n } = useTranslation();
  const presentation = getEventPresentation(event.type, t);
  const date = parseTimestamp(event.createdAt);
  const time = date ? formatLocalTime(date, i18n.language) : '';
  const label = getEventLabel(event, t);
  const result = formatLocaleNumber(event.newValue, i18n.language);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}, ${time}, ${t('activity.result')} ${result}`}
    >
      <Card variant="default" style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: presentation.backgroundColor }]}>
          <Ionicons name={presentation.icon} size={20} color={presentation.color} />
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <AppText variant="label" color={presentation.textColor}>
              {label}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {time}
            </AppText>
          </View>
          <View style={styles.rowBottom}>
            <AppText variant="caption" color="textSecondary" style={styles.description}>
              {presentation.description}
            </AppText>
            <View style={styles.result}>
              <AppText variant="caption" color="textMuted">
                {t('activity.result')}
              </AppText>
              <AppText variant="label">{result}</AppText>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );
}

function getEventLabel(event: CounterEvent, t: (key: 'history.reset') => string): string {
  if (event.type === 'reset') {
    return t('history.reset');
  }

  if (event.amount > 0) {
    return `+${event.amount}`;
  }

  return String(event.amount);
}

function getEventPresentation(
  type: CounterEventType,
  t: (key: 'history.increment' | 'history.decrement' | 'activity.resetDescription') => string,
) {
  switch (type) {
    case 'increment':
      return {
        icon: 'add' as const,
        color: colors.success,
        backgroundColor: colors.successSoft,
        textColor: 'success' as const,
        description: t('history.increment'),
      };
    case 'decrement':
      return {
        icon: 'remove' as const,
        color: colors.warning,
        backgroundColor: colors.warningSoft,
        textColor: 'warning' as const,
        description: t('history.decrement'),
      };
    case 'reset':
      return {
        icon: 'refresh' as const,
        color: colors.textSecondary,
        backgroundColor: colors.surfaceSecondary,
        textColor: 'textPrimary' as const,
        description: t('activity.resetDescription'),
      };
  }
}

const styles = StyleSheet.create({
  screenFill: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
  },
  list: {
    flex: 1,
  },
  content: {
    paddingTop: space[2],
    paddingBottom: space[8],
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingTop: space[4],
    paddingBottom: space[3],
  },
  sectionGap: {
    height: space[2],
  },
  itemGap: {
    height: space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[3],
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: space[3],
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space[2],
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space[3],
    marginTop: space[1],
  },
  description: {
    flex: 1,
    minWidth: 0,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
});
