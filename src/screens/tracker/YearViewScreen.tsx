import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Header, IconButton, Screen, Text } from '@/components';
import { dailyValues } from '@/domain/analysis';
import { dayKey, startOfWeek } from '@/domain/periods';
import { formatMonth, formatNumber } from '@/format';
import type { RootScreenProps } from '@/navigation/types';
import { usePro } from '@/pro/ProProvider';
import { usePreferences, useTracker } from '@/state';
import { useTheme } from '@/theme';

import { useAnalysisContext } from '../shared/useAnalysisContext';

const ALPHA = ['00', '40', '80', 'BF', 'FF'] as const;

export function YearViewScreen({ navigation, route }: RootScreenProps<'YearView'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pro = usePro();
  const { language } = usePreferences();
  const context = useAnalysisContext();
  const { tracker, events } = useTracker(route.params.trackerId);
  const [year, setYear] = useState(context.now.getFullYear());

  const values = useMemo(() => dailyValues(events, new Date(year, 0, 1), new Date(year, 11, 31)), [events, year]);
  const max = Math.max(1, ...[...values.values()]);

  useEffect(() => {
    if (pro.hydrated && !pro.isPro) {
      navigation.replace('Paywall', { feature: 'fullHistory' });
    }
  }, [navigation, pro.hydrated, pro.isPro]);

  if (!tracker || !pro.isPro) {
    return null;
  }

  const tone = theme.tone(tracker.color);
  const firstYear = new Date(Math.min(Date.parse(tracker.createdAt), events[0] ? Date.parse(events[0].createdAt) : Infinity)).getFullYear();

  return (
    <Screen>
      <Header title={t('calendar.yearTitle', { year })} subtitle={tracker.name} />
      <View style={styles.nav}>
        <IconButton icon="chevron-back" accessibilityLabel={String(year - 1)} disabled={year <= firstYear} onPress={() => setYear(year - 1)} />
        <Text variant="heading">{year}</Text>
        <IconButton icon="chevron-forward" accessibilityLabel={String(year + 1)} disabled={year >= context.now.getFullYear()} onPress={() => setYear(year + 1)} />
      </View>
      <View style={styles.months}>
        {Array.from({ length: 12 }, (_, month) => {
          const first = new Date(year, month, 1);
          const days = new Date(year, month + 1, 0).getDate();
          const offset = (first.getDay() - startOfWeek(first, context.weekStart).getDay() + 7) % 7;
          let total = 0;
          const cells = Array.from({ length: offset + days }, (_, index) => {
            if (index < offset) {
              return <View key={`pad-${index}`} style={styles.cell} />;
            }
            const date = new Date(year, month, index - offset + 1);
            const value = Math.max(0, values.get(dayKey(date)) ?? 0);
            total += value;
            const level = value <= 0 ? 0 : Math.min(4, Math.ceil((value / max) * 4));
            return (
              <View
                key={dayKey(date)}
                style={[
                  styles.cell,
                  {
                    borderRadius: 2,
                    backgroundColor: level > 0 ? `${tone.solid}${ALPHA[level]}` : theme.colors.sunken,
                  },
                ]}
              />
            );
          });
          return (
            <View
              key={month}
              accessible
              accessibilityLabel={`${formatMonth(first, language)}: ${formatNumber(total, language)}`}
              style={styles.month}
            >
              <Text variant="micro" tone="inkSecondary" style={styles.monthLabel}>
                {formatMonth(first, language)}
              </Text>
              <View style={styles.grid}>{cells}</View>
              <Text variant="micro" tone="inkTertiary">
                {formatNumber(total, language)}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  months: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    marginTop: 8,
  },
  month: {
    width: '30%',
    gap: 4,
  },
  monthLabel: {
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  cell: {
    width: '12.1%',
    aspectRatio: 1,
  },
});
