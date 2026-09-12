import type { TFunction } from 'i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, space } from '@/theme';
import type { WeekDayState } from '@/utils/consistency';

export type WeekConsistencyItem = {
  key: string;
  label: string;
  state: WeekDayState;
  accessibilityLabel: string;
};

type WeekConsistencyProps = {
  days: WeekConsistencyItem[];
};

export function getWeekDayAccessibilityLabel(
  translate: TFunction,
  label: string,
  state: WeekDayState,
): string {
  switch (state) {
    case 'active':
      return `${label}, ${translate('consistency.activeDay')}`;
    case 'inactivePast':
      return `${label}, ${translate('consistency.inactiveDay')}`;
    case 'todayActive':
      return `${label}, ${translate('consistency.todayActive')}`;
    case 'todayPending':
      return `${label}, ${translate('consistency.todayPending')}`;
    case 'future':
      return `${label}, ${translate('consistency.futureDay')}`;
  }
}

export function WeekConsistency({ days }: WeekConsistencyProps) {
  return (
    <View style={styles.row}>
      {days.map((day) => (
        <View
          key={day.key}
          style={styles.day}
          accessible
          accessibilityRole="text"
          accessibilityLabel={day.accessibilityLabel}
        >
          <AppText variant="captionSmall" color="textSecondary" align="center" numberOfLines={1}>
            {day.label}
          </AppText>
          <WeekDayMarker state={day.state} />
        </View>
      ))}
    </View>
  );
}

function WeekDayMarker({ state }: { state: WeekDayState }) {
  const filled = state === 'active' || state === 'todayActive';
  const isToday = state === 'todayActive' || state === 'todayPending';

  return (
    <View style={[styles.markerRing, isToday && styles.markerRingToday]}>
      <View
        style={[
          styles.marker,
          filled && styles.markerFilled,
          state === 'inactivePast' && styles.markerMissed,
          state === 'future' && styles.markerFuture,
          state === 'todayPending' && styles.markerPending,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[1],
  },
  day: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: space[1],
  },
  markerRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  markerRingToday: {
    borderColor: colors.primary,
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    backgroundColor: 'transparent',
  },
  markerFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  markerMissed: {
    borderColor: colors.disabled,
    backgroundColor: 'transparent',
  },
  markerFuture: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  markerPending: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
});
