import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/layout/Card';
import { AppText } from '@/components/typography/AppText';
import { space, type ColorToken } from '@/theme';

type StatCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: string;
  tone?: Extract<ColorToken, 'primary' | 'success' | 'warning' | 'error' | 'textPrimary'>;
};

export function StatCard({ label, value, icon, trend, tone = 'textPrimary' }: StatCardProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      {icon}
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="displayNumber" color={tone}>
        {value}
      </AppText>
      {trend ? (
        <AppText variant="captionSmall" color="success">
          {trend}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: space[1],
    minWidth: 0,
  },
});
