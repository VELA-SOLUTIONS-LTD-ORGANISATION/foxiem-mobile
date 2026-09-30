import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { dayCells, type Context, type DayCell } from '@/domain/analysis';
import { addDays, startOfMonth, startOfWeek } from '@/domain/periods';
import type { CountEvent, Tracker } from '@/domain/types';
import { formatLongDate, formatMonthYear, formatNumber, weekdayName } from '@/format';
import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

type MonthCalendarProps = {
  tracker: Tracker;
  events: readonly CountEvent[];
  month: Date;
  context: Context;
  locale: string;
  selectedKey: string | null;
  onSelect: (cell: DayCell) => void;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  footer?: React.ReactNode;
};

function level(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) {
    return 0;
  }
  const ratio = value / max;
  return ratio >= 1 ? 4 : ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
}

const ALPHA = ['00', '33', '66', 'AA', 'FF'] as const;

function usesDailyGoal(tracker: Tracker): boolean {
  return tracker.period === 'day' && (tracker.intent === 'reach' || tracker.intent === 'limit') && Boolean(tracker.target);
}

/** Heat by value, with goal outcomes for daily targets and limits. Tap a day to read it. */
export function MonthCalendar({
  tracker,
  events,
  month,
  context,
  locale,
  selectedKey,
  onSelect,
  onPrevious,
  onNext,
  footer,
}: MonthCalendarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tone = theme.tone(tracker.color);
  const first = startOfMonth(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const cells = dayCells(
    tracker,
    events,
    startOfWeek(first, context.weekStart),
    addDays(startOfWeek(last, context.weekStart), 6),
    context,
  );
  const monthCells = cells.filter((cell) => cell.date.getMonth() === first.getMonth());
  const dailyGoal = usesDailyGoal(tracker);
  // Daily goals shade against the goal itself, so a full colour means "target reached".
  const max = dailyGoal ? tracker.target! : Math.max(0, ...monthCells.map((cell) => cell.value));
  const weeks: DayCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return (
    <View>
      <View style={styles.nav}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={t('calendar.previousMonth')}
          onPress={() => onPrevious?.()}
          disabled={!onPrevious}
        />
        <Text variant="heading" align="center" style={styles.navTitle}>
          {formatMonthYear(first, locale)}
        </Text>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel={t('calendar.nextMonth')}
          onPress={() => onNext?.()}
          disabled={!onNext}
        />
      </View>
      <View style={styles.week}>
        {weeks[0]?.map((cell) => (
          <Text key={cell.key} variant="micro" tone="inkTertiary" align="center" style={styles.weekday}>
            {weekdayName(cell.date.getDay(), locale, 'narrow')}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]!.key} style={styles.week}>
          {week.map((cell) => {
            const inMonth = cell.date.getMonth() === first.getMonth();
            if (!inMonth) {
              return <View key={cell.key} style={styles.cell} />;
            }
            const value = Math.max(0, cell.value);
            const heat = level(value, max);
            const future = cell.outcome === 'future';
            const selected = selectedKey === cell.key;
            const date = formatLongDate(cell.date, locale, context.now);
            const valueText = value > 0 ? formatNumber(value, locale) : t('calendar.noEntries');
            const label =
              dailyGoal && cell.outcome === 'success'
                ? t('calendar.dayGoalMet', { date, value: valueText })
                : dailyGoal && cell.outcome === 'miss'
                  ? t('calendar.dayGoalMissed', { date, value: valueText })
                  : t('calendar.dayA11y', { date, value: valueText });
            const overLimit = dailyGoal && tracker.intent === 'limit' && cell.outcome === 'miss';
            return (
              <Pressable
                key={cell.key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected, disabled: future }}
                disabled={future}
                onPress={() => onSelect(cell)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.cellInner,
                    {
                      borderRadius: theme.radius.sm,
                      backgroundColor: heat > 0 ? `${tone.solid}${ALPHA[heat]}` : 'transparent',
                      borderColor: selected ? theme.colors.ink : cell.isToday ? theme.colors.inkTertiary : 'transparent',
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    color={heat >= 3 ? tone.onSolid : future ? theme.colors.inkDisabled : theme.colors.ink}
                    maxFontSizeMultiplier={1.2}
                  >
                    {cell.date.getDate()}
                  </Text>
                  {dailyGoal && (cell.outcome === 'success' || overLimit) ? (
                    <View
                      style={[
                        styles.marker,
                        { backgroundColor: overLimit ? theme.colors.caution : heat >= 3 ? tone.onSolid : tone.ink },
                      ]}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.legend} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text variant="micro" tone="inkTertiary">
          {t('calendar.legendLess')}
        </Text>
        {([1, 2, 3, 4] as const).map((step) => (
          <View key={step} style={[styles.swatch, { backgroundColor: `${tone.solid}${ALPHA[step]}` }]} />
        ))}
        <Text variant="micro" tone="inkTertiary">
          {t('calendar.legendMore')}
        </Text>
      </View>
      {footer}
    </View>
  );
}

export function CalendarLockedRow({ onPress, label }: { onPress: () => void; label: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.locked, { borderRadius: theme.radius.md, backgroundColor: pressed ? theme.colors.sunken : 'transparent' }]}
    >
      <Ionicons name="lock-closed-outline" size={16} color={theme.colors.inkSecondary} />
      <Text variant="caption" tone="inkSecondary">
        {label}
      </Text>
    </Pressable>
  );
}

/** Minimum interactive height of a day; the column width supplies the other axis. */
export const CELL_HIT_HEIGHT = 44;

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  navTitle: {
    flex: 1,
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    paddingVertical: 4,
  },
  // The touch target is the whole column by 44pt; the drawn day is smaller and centred, so neighbouring
  // targets tile without overlapping and the visible grid stays compact at 320pt.
  cell: {
    flex: 1,
    height: CELL_HIT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    width: '94%',
    maxWidth: 44,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  locked: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    marginTop: 4,
  },
});
