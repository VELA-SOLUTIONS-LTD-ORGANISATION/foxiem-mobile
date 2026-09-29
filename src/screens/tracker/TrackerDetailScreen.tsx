import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AnimatedCount,
  Banner,
  Button,
  CountKey,
  DayDots,
  Group,
  Header,
  IconButton,
  Meter,
  Screen,
  Section,
  Text,
  TrackerIcon,
} from '@/components';
import { trackerSnapshot } from '@/domain/analysis';
import type { CountEvent } from '@/domain/types';
import { describeGoal, formatDelta, formatNumber, heroCaption, statusSentence } from '@/format';
import { useResponsiveLayout } from '@/hooks';
import type { RootScreenProps } from '@/navigation/types';
import { useCountFeedback, usePreferences, useTracker, useTrackerStore } from '@/state';
import { heroFontSize, useTheme } from '@/theme';

import { AmountSheet } from '../shared/AmountSheet';
import { EntrySheet } from '../shared/EntrySheet';
import { useAnalysisContext } from '../shared/useAnalysisContext';
import { useCounting } from '../shared/useCounting';
import {
  CalendarSection,
  ConsistencySection,
  InsightsSection,
  LinkRow,
  NotesSection,
  ReduceStrip,
  TrendSection,
  WeekSection,
} from './DetailSections';
import { EntryRow } from './EntryRow';

export function TrackerDetailScreen({ navigation, route }: RootScreenProps<'TrackerDetail'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { language, reduceMotion } = usePreferences();
  const { contentWidth } = useResponsiveLayout();
  const { tracker, events } = useTracker(route.params.trackerId);
  const store = useTrackerStore();
  const feedback = useCountFeedback();
  const count = useCounting();
  const context = useAnalysisContext();
  const [celebrate, setCelebrate] = useState(0);
  const [amountOpen, setAmountOpen] = useState(false);
  const [entry, setEntry] = useState<{ event: CountEvent | null } | null>(null);

  const snapshot = useMemo(
    () => (tracker ? trackerSnapshot(tracker, events, context) : null),
    [context, events, tracker],
  );

  if (!tracker || !snapshot) {
    return (
      <Screen>
        <Header />
        <Text variant="body" tone="inkSecondary" style={styles.missing}>
          {t('detail.notFound')}
        </Text>
      </Screen>
    );
  }

  const tone = theme.tone(tracker.color);
  const archived = tracker.archivedAt !== null;
  const heroText = formatNumber(snapshot.hero, language);
  const fontSize = heroFontSize(heroText, contentWidth);
  const status = statusSentence(tracker, snapshot, t, language, context.now);
  const stepLabel = formatNumber(tracker.step, language);
  const pending = feedback.pending?.trackerId === tracker.id ? feedback.pending : null;
  const recent = [...events].reverse().slice(0, 5);
  const statusColor =
    tracker.intent === 'limit' && (snapshot.state === 'overLimit' || snapshot.state === 'atLimit')
      ? theme.colors.caution
      : snapshot.state === 'reached'
        ? theme.colors.improvement
        : tracker.intent === 'reduce' && snapshot.comparison && snapshot.comparison.direction !== 'same'
          ? snapshot.comparison.direction === 'down'
            ? theme.colors.improvement
            : theme.colors.caution
          : theme.colors.inkSecondary;

  const onCount = (direction: 'up' | 'down', amount?: number) => {
    const result = count(tracker, snapshot, direction, amount);
    if (result?.completed) {
      setCelebrate((value) => value + 1);
    }
  };

  return (
    <Screen testID="tracker-detail">
      <Header
        title={tracker.name}
        right={
          <IconButton
            testID="detail-settings"
            icon="settings-outline"
            accessibilityLabel={t('detail.settings')}
            onPress={() => navigation.navigate('TrackerSettings', { trackerId: tracker.id })}
            style={styles.gear}
          />
        }
      />

      {archived ? (
        <View style={styles.archived}>
          <Banner
            icon="archive-outline"
            title={t('detail.archivedNotice')}
            action={{ label: t('detail.restore'), onPress: () => store.restoreTracker(tracker.id) }}
          />
        </View>
      ) : null}

      <View style={styles.hero}>
        <View style={styles.intentLine}>
          <TrackerIcon icon={tracker.icon} color={tracker.color} size={28} />
          <Text variant="caption" tone="inkSecondary" numberOfLines={2} style={styles.intentText}>
            {describeGoal(tracker, t, language)}
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${tracker.name}: ${heroText} ${heroCaption(tracker, t, language)}. ${status}`}
          style={styles.number}
        >
          <AnimatedCount
            value={snapshot.hero}
            locale={language}
            fontSize={fontSize}
            reduceMotion={reduceMotion}
            celebrateKey={celebrate}
            color={theme.colors.ink}
          />
          <Text variant="bodyStrong" tone="inkSecondary" align="center" style={styles.caption}>
            {heroCaption(tracker, t, language)}
          </Text>
        </View>
        {tracker.intent === 'reach' || tracker.intent === 'limit' ? (
          <View style={styles.meter}>
            <Meter
              color={tracker.color}
              kind={tracker.intent}
              ratio={tracker.target ? snapshot.periodValue / tracker.target : 0}
              height={10}
              reduceMotion={reduceMotion}
            />
          </View>
        ) : null}
        {tracker.intent === 'consistency' ? (
          <View style={styles.meter}>
            <DayDots days={snapshot.week} color={tracker.color} locale={language} showLabels size={14} />
          </View>
        ) : null}
        <View style={styles.status}>
          {snapshot.state === 'reached' ? (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.improvement}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
          <Text variant="bodyStrong" color={statusColor} align="center" style={styles.statusText}>
            {status}
          </Text>
        </View>
        {tracker.intent === 'reduce' ? (
          <ReduceStrip
            tracker={tracker}
            events={events}
            context={context}
            locale={language}
            samePoint={snapshot.comparison?.previous ?? null}
          />
        ) : null}
      </View>

      <View style={styles.keys}>
        <CountKey
          testID="detail-minus"
          kind="minus"
          color={tracker.color}
          disabled={archived}
          reduceMotion={reduceMotion}
          accessibilityLabel={t('detail.decrement', { amount: stepLabel })}
          onPress={() => onCount('down')}
          style={styles.minus}
        />
        <CountKey
          testID="detail-plus"
          kind="hero"
          color={tracker.color}
          disabled={archived}
          reduceMotion={reduceMotion}
          label={`+${stepLabel}`}
          accessibilityLabel={t('detail.increment', { amount: stepLabel })}
          accessibilityHint={t('detail.addAmountHint')}
          onPress={() => onCount('up')}
          onLongPress={() => setAmountOpen(true)}
        />
      </View>
      <View style={styles.underKeys}>
        {pending ? (
          <View style={styles.undoLine}>
            <Text variant="caption" tone="inkSecondary">
              {pending.delta >= 0
                ? t('detail.added', { amount: formatNumber(pending.delta, language) })
                : t('detail.subtracted', { amount: formatNumber(-pending.delta, language) })}
            </Text>
            <Pressable
              testID="detail-undo"
              accessibilityRole="button"
              accessibilityLabel={`${t('common.undo')} ${formatDelta(pending.delta, language)}`}
              onPress={() => feedback.undo()}
              hitSlop={8}
              style={({ pressed }) => [
                styles.undo,
                { borderRadius: theme.radius.sm, backgroundColor: pressed ? theme.colors.lineStrong : theme.colors.sunken },
              ]}
            >
              <Text variant="label">{t('common.undo')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAmountOpen(true)}
            disabled={archived}
            hitSlop={6}
            style={styles.amountLink}
          >
            <Text variant="caption" tone="inkTertiary">
              {t('detail.addAmountHint')}
            </Text>
          </Pressable>
        )}
      </View>

      {events.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
          <Text variant="bodyStrong" align="center">
            {t('detail.emptyTitle')}
          </Text>
          <Text variant="caption" tone="inkSecondary" align="center" style={styles.emptyBody}>
            {t('detail.emptyBody')}
          </Text>
          <Button title={t('detail.addEntry')} variant="secondary" compact onPress={() => setEntry({ event: null })} style={styles.emptyButton} />
        </View>
      ) : (
        <>
          <WeekSection tracker={tracker} snapshot={snapshot} locale={language} />
          <ConsistencySection tracker={tracker} events={events} context={context} locale={language} />
          <CalendarSection
            tracker={tracker}
            events={events}
            context={context}
            locale={language}
            onYear={() => navigation.navigate('YearView', { trackerId: tracker.id })}
          />
          <InsightsSection tracker={tracker} events={events} context={context} locale={language} trackers={store.trackers} />
          <TrendSection tracker={tracker} events={events} context={context} locale={language} />
          <Section
            title={t('detail.recent')}
            action={
              <Pressable accessibilityRole="button" onPress={() => setEntry({ event: null })} hitSlop={8} style={styles.sectionAction}>
                <Text variant="label" color={tone.ink}>
                  {t('detail.addEntry')}
                </Text>
              </Pressable>
            }
          >
            <Group inset={58}>
              {recent.map((event) => (
                <EntryRow
                  key={event.id}
                  event={event}
                  tracker={tracker}
                  locale={language}
                  showDate={undefined}
                  onPress={(item) => setEntry({ event: item })}
                />
              ))}
              <LinkRow label={t('detail.allHistory')} onPress={() => navigation.navigate('History', { trackerId: tracker.id })} />
            </Group>
          </Section>
          <NotesSection notes={tracker.notes} />
        </>
      )}

      <AmountSheet
        tracker={amountOpen ? tracker : null}
        onClose={() => setAmountOpen(false)}
        onAdd={(amount) => {
          setAmountOpen(false);
          onCount('up', amount);
        }}
      />
      <EntrySheet tracker={tracker} event={entry?.event ?? null} visible={entry !== null} onClose={() => setEntry(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: {
    marginTop: 24,
  },
  gear: {
    marginRight: -12,
  },
  archived: {
    marginTop: 8,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 12,
  },
  intentLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  intentText: {
    flexShrink: 1,
  },
  number: {
    alignItems: 'center',
    marginTop: 12,
    minHeight: 120,
    justifyContent: 'center',
  },
  caption: {
    marginTop: 2,
  },
  meter: {
    alignSelf: 'stretch',
    marginTop: 18,
  },
  status: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusText: {
    flexShrink: 1,
  },
  keys: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  minus: {
    width: 64,
  },
  underKeys: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  undoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  undo: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  amountLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  empty: {
    marginTop: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  emptyBody: {
    marginTop: 6,
  },
  emptyButton: {
    marginTop: 14,
    alignSelf: 'center',
  },
  sectionAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
