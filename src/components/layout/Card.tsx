import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows, space } from '@/theme';

type CardVariant = 'default' | 'outlined' | 'elevated' | 'soft';

type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
};

export function Card({ children, variant = 'default', style }: CardProps) {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    padding: space[4],
  },
  default: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  soft: {
    backgroundColor: colors.primarySoft,
  },
});
