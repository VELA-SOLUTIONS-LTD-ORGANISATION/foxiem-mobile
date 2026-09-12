import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/layout/Card';
import { AppText } from '@/components/typography/AppText';
import { space } from '@/theme';

type MetricCardProps = {
  title: string;
  value: string;
  description?: string;
  footer?: ReactNode;
};

export function MetricCard({ title, value, description, footer }: MetricCardProps) {
  return (
    <Card variant="elevated">
      <View style={styles.copy}>
        <AppText variant="label" color="textSecondary">
          {title}
        </AppText>
        <AppText variant="h2">{value}</AppText>
        {description ? (
          <AppText variant="bodySmall" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: space[1],
  },
});
