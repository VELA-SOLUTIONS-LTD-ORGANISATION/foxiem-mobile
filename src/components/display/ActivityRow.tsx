import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { sizes, space, type ColorToken } from '@/theme';

type ActivityRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  value?: string;
  valueColor?: Extract<ColorToken, 'textPrimary' | 'success' | 'error' | 'warning' | 'primary'>;
};

export function ActivityRow({
  title,
  subtitle,
  leading,
  value,
  valueColor = 'textPrimary',
}: ActivityRowProps) {
  return (
    <View style={styles.row}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.copy}>
        <AppText variant="body">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="label" color={valueColor}>
          {value}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.controlLg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  leading: {
    width: sizes.iconXl,
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    gap: space[1],
  },
});
