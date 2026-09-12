import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, sizes } from '@/theme';

type IconButtonProps = {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      role="button"
      aria-label={accessibilityLabel}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  disabled: {
    opacity: 0.4,
  },
});
