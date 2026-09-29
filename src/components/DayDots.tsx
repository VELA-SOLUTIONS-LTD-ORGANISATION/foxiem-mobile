import { StyleSheet, View } from 'react-native';

import type { DayCell } from '@/domain/analysis';
import type { TrackerColor } from '@/domain/types';
import { weekdayName } from '@/format';
import { useTheme } from '@/theme';

import { Text } from './Text';

type DayDotsProps = {
  days: readonly DayCell[];
  color: TrackerColor;
  locale: string;
  showLabels?: boolean;
  size?: number;
};

/** One dot per day of the week: filled when active, ringed for today, hollow for days ahead. */
export function DayDots({ days, color, locale, showLabels = false, size = 10 }: DayDotsProps) {
  const theme = useTheme();
  const tone = theme.tone(color);
  return (
    <View style={[styles.row, showLabels && styles.rowLabelled]}>
      {days.map((day) => {
        const active = day.value > 0;
        const future = day.outcome === 'future';
        return (
          <View key={day.key} style={[styles.cell, showLabels && styles.cellLabelled]}>
            {showLabels ? (
              <Text variant="micro" tone={day.isToday ? 'ink' : 'inkTertiary'} maxFontSizeMultiplier={1.3}>
                {weekdayName(day.date.getDay(), locale, 'narrow')}
              </Text>
            ) : null}
            <View
              style={[
                styles.dot,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: active ? tone.solid : 'transparent',
                  borderColor: active ? tone.solid : future ? theme.colors.line : theme.colors.lineStrong,
                },
                day.isToday && {
                  borderColor: active ? tone.solid : theme.colors.ink,
                  borderWidth: 2,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabelled: {
    justifyContent: 'space-between',
    gap: 0,
  },
  cell: {
    alignItems: 'center',
  },
  cellLabelled: {
    flex: 1,
    gap: 6,
  },
  dot: {
    borderWidth: 1.5,
  },
});
