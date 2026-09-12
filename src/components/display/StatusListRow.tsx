import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, sizes, space } from '@/theme';

import { StatusBadge } from './StatusBadge';

type StatusListRowProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  completed?: boolean;
  locked?: boolean;
};

export function StatusListRow({
  title,
  description,
  icon,
  completed = false,
  locked = false,
}: StatusListRowProps) {
  return (
    <View style={[styles.row, locked && styles.locked]}>
      <View style={styles.icon}>{icon}</View>
      <View style={styles.copy}>
        <AppText variant="body">{title}</AppText>
        {description ? (
          <AppText variant="caption" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <StatusBadge
        label={locked ? 'Locked' : completed ? 'Done' : 'Open'}
        variant={locked ? 'neutral' : completed ? 'success' : 'info'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.controlLg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  locked: {
    opacity: 0.7,
  },
  icon: {
    width: sizes.iconXl,
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    gap: space[1],
  },
});
