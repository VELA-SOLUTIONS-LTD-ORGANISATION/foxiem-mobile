import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type Theme } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'destructiveGhost';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  compact?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Tracker colour override for the primary fill. */
  fill?: { background: string; label: string };
};

function palette(theme: Theme, variant: ButtonVariant, pressed: boolean) {
  const { colors } = theme;
  switch (variant) {
    case 'primary':
      return { background: pressed ? colors.actionPressed : colors.action, label: colors.onAction, border: 'transparent' };
    case 'secondary':
      return { background: pressed ? colors.sunken : colors.surface, label: colors.ink, border: colors.lineStrong };
    case 'destructive':
      return { background: pressed ? colors.dangerSoft : colors.danger, label: pressed ? colors.danger : '#FFFFFF', border: 'transparent' };
    case 'destructiveGhost':
      return { background: pressed ? colors.dangerSoft : 'transparent', label: colors.danger, border: 'transparent' };
    default:
      return { background: pressed ? colors.sunken : 'transparent', label: colors.ink, border: 'transparent' };
  }
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  compact = false,
  accessibilityHint,
  accessibilityLabel,
  testID,
  style,
  fill,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => {
        const colors = palette(theme, variant, pressed);
        return [
          styles.base,
          compact ? styles.compact : styles.regular,
          {
            borderRadius: theme.radius.md,
            backgroundColor: fill ? fill.background : colors.background,
            borderColor: colors.border,
            opacity: inactive ? 0.45 : fill && pressed ? 0.86 : 1,
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const colors = palette(theme, variant, pressed);
        const label = fill ? fill.label : colors.label;
        return loading ? (
          <ActivityIndicator color={label} />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text variant="button" color={label} numberOfLines={2} align="center">
              {title}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  regular: {
    minHeight: 52,
    paddingVertical: 12,
  },
  compact: {
    minHeight: 44,
    paddingVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 1,
  },
});
