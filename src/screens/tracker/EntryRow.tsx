import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components';
import type { CountEvent, Tracker } from '@/domain';
import { formatNumber, formatTime } from '@/format';
import { useTheme } from '@/theme';

export function entryChangeText(event: CountEvent, t: ReturnType<typeof useTranslation>['t'], locale: string): string {
  switch (event.type) {
    case 'reset':
      return t('history.reset');
    case 'adjust':
      return t('history.adjusted', { value: formatNumber(event.newValue, locale) });
    case 'decrement':
      return t('history.subtracted', { amount: formatNumber(Math.abs(event.amount), locale) });
    default:
      return t('history.added', { amount: formatNumber(event.amount, locale) });
  }
}

type EntryRowProps = {
  event: CountEvent;
  tracker: Tracker;
  locale: string;
  onPress: (event: CountEvent) => void;
  showDate?: string;
};

export const EntryRow = memo(function EntryRow({ event, tracker, locale, onPress, showDate }: EntryRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const time = formatTime(new Date(event.createdAt), locale);
  const change = entryChangeText(event, t, locale);
  const tone = theme.tone(tracker.color);
  const negative = event.type === 'decrement' || event.type === 'reset';

  return (
    <Pressable
      testID={`entry-${event.id}`}
      accessibilityRole="button"
      accessibilityLabel={[t('history.entryA11y', { change, time }), showDate, event.note].filter(Boolean).join(', ')}
      accessibilityHint={t('entry.editTitle')}
      onPress={() => onPress(event)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.sunken }]}
    >
      <View style={[styles.badge, { backgroundColor: negative ? theme.colors.sunken : tone.soft, borderRadius: theme.radius.sm }]}>
        <Ionicons
          name={event.type === 'reset' ? 'refresh' : event.type === 'adjust' ? 'swap-vertical' : negative ? 'remove' : 'add'}
          size={16}
          color={negative ? theme.colors.inkSecondary : tone.ink}
        />
      </View>
      <View style={styles.copy}>
        <View style={styles.top}>
          <Text variant="numberSmall">{change}</Text>
          {event.editedAt ? (
            <Text variant="micro" tone="inkTertiary">
              {t('history.edited')}
            </Text>
          ) : null}
        </View>
        {event.note ? (
          <Text variant="caption" tone="inkSecondary" numberOfLines={2}>
            {event.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text variant="caption" tone="inkSecondary" style={styles.time}>
          {showDate ? `${showDate} · ${time}` : time}
        </Text>
        {tracker.period === 'all' ? (
          <Text variant="micro" tone="inkTertiary">
            {t('history.result', { value: formatNumber(event.newValue, locale) })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  badge: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    alignItems: 'flex-end',
  },
  time: {
    fontVariant: ['tabular-nums'],
  },
});
