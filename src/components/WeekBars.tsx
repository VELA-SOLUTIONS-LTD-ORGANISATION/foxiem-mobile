import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { DayCell } from '@/domain/analysis';
import type { TrackerColor } from '@/domain/types';
import { formatNumber, weekdayName } from '@/format';
import { useTheme } from '@/theme';

import { Text } from './Text';

type WeekBarsProps = {
  days: readonly DayCell[];
  color: TrackerColor;
  locale: string;
  /** Daily target or limit, drawn as a line. */
  line?: { value: number; kind: 'target' | 'limit' } | null;
  height?: number;
};

export function WeekBars({ days, color, locale, line, height = 120 }: WeekBarsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tone = theme.tone(color);
  const max = Math.max(1, line?.value ?? 0, ...days.map((day) => day.value));
  const summary = days
    .map((day) => `${weekdayName(day.date.getDay(), locale, 'long')} ${formatNumber(Math.max(0, day.value), locale)}`)
    .join(', ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={t('detail.weekChartA11y', { values: summary })}>
      <View style={[styles.plot, { height }]}>
        {line && line.value > 0 ? (
          <View style={[styles.line, { bottom: (line.value / max) * height, borderColor: theme.colors.inkTertiary }]}>
            <Text variant="micro" tone="inkTertiary" style={[styles.lineLabel, { backgroundColor: theme.colors.surface }]}>
              {line.kind === 'target'
                ? t('detail.targetLine', { target: formatNumber(line.value, locale) })
                : t('detail.limitLine', { target: formatNumber(line.value, locale) })}
            </Text>
          </View>
        ) : null}
        {days.map((day) => {
          const value = Math.max(0, day.value);
          const over = line?.kind === 'limit' && value > line.value;
          return (
            <View key={day.key} style={styles.column}>
              {value > 0 && (day.isToday || value === max) ? (
                <Text variant="micro" tone="inkSecondary" style={styles.value} maxFontSizeMultiplier={1.2}>
                  {formatNumber(value, locale)}
                </Text>
              ) : null}
              <View
                style={[
                  styles.bar,
                  {
                    height: value > 0 ? Math.max(4, (value / max) * (height - 18)) : 2,
                    borderTopLeftRadius: theme.radius.xs,
                    borderTopRightRadius: theme.radius.xs,
                    backgroundColor: value > 0 ? (over ? theme.colors.caution : tone.solid) : theme.colors.track,
                    opacity: day.outcome === 'future' ? 0.4 : 1,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {days.map((day) => (
          <Text
            key={day.key}
            variant="micro"
            tone={day.isToday ? 'ink' : 'inkTertiary'}
            align="center"
            style={styles.label}
            maxFontSizeMultiplier={1.3}
          >
            {weekdayName(day.date.getDay(), locale, 'short')}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  value: {
    marginBottom: 4,
  },
  bar: {
    width: '100%',
    maxWidth: 36,
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  lineLabel: {
    position: 'absolute',
    right: 0,
    top: -18,
    paddingHorizontal: 4,
  },
  labels: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  label: {
    flex: 1,
  },
});
