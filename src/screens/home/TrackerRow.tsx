import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AnimatedCount, CountKey, DayDots, IconButton, Meter, Text, TrackerIcon } from '@/components';
import { trackerSnapshot, type Context, type TrackerSnapshot } from '@/domain/analysis';
import type { CountEvent, Tracker } from '@/domain/types';
import { formatDelta, formatNumber, numberCaption, statusLine } from '@/format';
import { useTheme, type Theme } from '@/theme';

type TrackerRowProps = {
  tracker: Tracker;
  events: readonly CountEvent[];
  context: Context;
  locale: string;
  reduceMotion: boolean;
  first: boolean;
  last: boolean;
  pendingDelta: number | null;
  /** Narrow phones (under 360 pt): smaller icon and key so the name keeps its width. */
  compact: boolean;
  reordering: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onCount: (tracker: Tracker, snapshot: TrackerSnapshot, direction: 'up' | 'down') => void;
  onAmount: (tracker: Tracker) => void;
  onOpen: (tracker: Tracker) => void;
  onUndo: () => void;
  onMove: (tracker: Tracker, direction: -1 | 1) => void;
};

function statusTone(tracker: Tracker, snapshot: TrackerSnapshot, theme: Theme): string {
  if (tracker.intent === 'limit' && (snapshot.state === 'overLimit' || snapshot.state === 'atLimit')) {
    return theme.colors.caution;
  }
  if (tracker.intent === 'reach' && snapshot.state === 'reached') {
    return theme.colors.improvement;
  }
  if (tracker.intent === 'reduce' && snapshot.comparison && snapshot.comparison.direction !== 'same') {
    return snapshot.comparison.direction === 'down' ? theme.colors.improvement : theme.colors.caution;
  }
  return theme.colors.inkSecondary;
}

export const TrackerRow = memo(function TrackerRow({
  tracker,
  events,
  context,
  locale,
  reduceMotion,
  first,
  last,
  pendingDelta,
  compact,
  reordering,
  canMoveUp,
  canMoveDown,
  onCount,
  onAmount,
  onOpen,
  onUndo,
  onMove,
}: TrackerRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const snapshot = useMemo(() => trackerSnapshot(tracker, events, context), [tracker, events, context]);
  const status = statusLine(tracker, snapshot, t, locale, context.now);
  const caption = numberCaption(tracker, t, locale);
  const value = formatNumber(snapshot.hero, locale);
  const stepLabel = formatNumber(tracker.step, locale);

  const onAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') {
      onCount(tracker, snapshot, 'up');
    } else if (event.nativeEvent.actionName === 'decrement') {
      onCount(tracker, snapshot, 'down');
    } else if (event.nativeEvent.actionName === 'activate') {
      onOpen(tracker);
    }
  };

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.line,
          borderTopLeftRadius: first ? theme.radius.lg : 0,
          borderTopRightRadius: first ? theme.radius.lg : 0,
          borderBottomLeftRadius: last ? theme.radius.lg : 0,
          borderBottomRightRadius: last ? theme.radius.lg : 0,
          borderTopWidth: first ? StyleSheet.hairlineWidth : 0,
          borderBottomWidth: last ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      {!first ? (
        <View style={[styles.separator, compact && styles.separatorCompact, { backgroundColor: theme.colors.line }]} />
      ) : null}
      <Pressable
        testID={`tracker-row-${tracker.id}`}
        accessibilityRole="button"
        accessibilityLabel={t('status.a11ySummary', { name: tracker.name, value: `${value} ${caption}`, status })}
        accessibilityHint={t('home.rowHint')}
        accessibilityActions={
          reordering
            ? undefined
            : [
                { name: 'activate' },
                { name: 'increment', label: t('home.countA11y', { amount: stepLabel, name: tracker.name }) },
                { name: 'decrement', label: t('home.decrementA11y', { amount: stepLabel, name: tracker.name }) },
              ]
        }
        onAccessibilityAction={onAction}
        disabled={reordering}
        onPress={() => onOpen(tracker)}
        style={({ pressed }) => [styles.main, compact && styles.mainCompact, pressed && { opacity: 0.7 }]}
      >
        <TrackerIcon icon={tracker.icon} color={tracker.color} size={compact ? 32 : 40} />
        <View style={styles.copy}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {tracker.name}
          </Text>
          {pendingDelta !== null ? (
            <View style={styles.undoLine}>
              <Text variant="caption" tone="inkSecondary">
                {formatDelta(pendingDelta, locale)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('common.undo')} ${formatDelta(pendingDelta, locale)} ${tracker.name}`}
                onPress={onUndo}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.undo,
                  { borderRadius: theme.radius.sm, backgroundColor: pressed ? theme.colors.lineStrong : theme.colors.sunken },
                ]}
              >
                <Text variant="label">{t('common.undo')}</Text>
              </Pressable>
            </View>
          ) : (
            <Text variant="caption" color={statusTone(tracker, snapshot, theme)} numberOfLines={2} style={styles.status}>
              {status}
            </Text>
          )}
          {tracker.intent === 'reach' || tracker.intent === 'limit' ? (
            <View style={styles.meter}>
              <Meter
                color={tracker.color}
                kind={tracker.intent}
                ratio={tracker.target ? snapshot.periodValue / tracker.target : 0}
                height={4}
                reduceMotion={reduceMotion}
              />
            </View>
          ) : null}
          {tracker.intent === 'consistency' ? (
            <View style={styles.meter}>
              <DayDots days={snapshot.week} color={tracker.color} locale={locale} size={9} />
            </View>
          ) : null}
        </View>
        <View style={[styles.value, compact && styles.valueCompact]}>
          <AnimatedCount value={snapshot.hero} locale={locale} fontSize={value.length > 6 ? 22 : 30} reduceMotion={reduceMotion} />
          <Text variant="micro" tone="inkTertiary" align="right" numberOfLines={compact ? 2 : 1} style={styles.caption}>
            {caption}
          </Text>
        </View>
      </Pressable>
      {reordering ? (
        <View style={styles.reorder}>
          <IconButton
            icon="chevron-up"
            accessibilityLabel={t('home.moveUp', { name: tracker.name })}
            disabled={!canMoveUp}
            onPress={() => onMove(tracker, -1)}
          />
          <IconButton
            icon="chevron-down"
            accessibilityLabel={t('home.moveDown', { name: tracker.name })}
            disabled={!canMoveDown}
            onPress={() => onMove(tracker, 1)}
          />
        </View>
      ) : (
        <CountKey
          testID={`tracker-plus-${tracker.id}`}
          kind="row"
          color={tracker.color}
          reduceMotion={reduceMotion}
          accessibilityLabel={t('home.countA11y', { amount: stepLabel, name: tracker.name })}
          accessibilityHint={t('detail.addAmountHint')}
          onPress={() => onCount(tracker, snapshot, 'up')}
          onLongPress={() => onAmount(tracker)}
          size={compact ? 48 : undefined}
          style={compact ? styles.keyCompact : styles.key}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingRight: 12,
  },
  separator: {
    position: 'absolute',
    top: 0,
    left: 66,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  separatorCompact: {
    left: 54,
  },
  mainCompact: {
    paddingLeft: 12,
    gap: 10,
  },
  valueCompact: {
    maxWidth: 64,
  },
  keyCompact: {
    marginLeft: 2,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  status: {
    marginTop: 2,
  },
  undoLine: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  undo: {
    paddingHorizontal: 12,
    minHeight: 30,
    justifyContent: 'center',
  },
  meter: {
    marginTop: 8,
    marginRight: 4,
  },
  value: {
    alignItems: 'flex-end',
    minWidth: 44,
    maxWidth: 110,
  },
  caption: {
    marginTop: 1,
  },
  key: {
    marginLeft: 4,
  },
  reorder: {
    flexDirection: 'row',
  },
});
