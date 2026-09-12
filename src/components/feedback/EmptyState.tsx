import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/buttons/AppButton';
import { AppText } from '@/components/typography/AppText';
import { space } from '@/theme';

type EmptyStateProps = {
  title: string;
  body?: string;
  icon?: ReactNode;
  illustration?: ReactNode;
  actionLabel?: string;
  onActionPress?: () => void;
  compact?: boolean;
};

export function EmptyState({
  title,
  body,
  icon,
  illustration,
  actionLabel,
  onActionPress,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, compact ? styles.compact : styles.full]}>
      {illustration ?? icon}
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="body" color="textSecondary" align="center">
          {body}
        </AppText>
      ) : null}
      {actionLabel && onActionPress ? (
        <AppButton title={actionLabel} onPress={onActionPress} fullWidth={false} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space[3],
    padding: space[6],
  },
  compact: {
    paddingVertical: space[4],
  },
  full: {
    flex: 1,
    justifyContent: 'center',
  },
});
