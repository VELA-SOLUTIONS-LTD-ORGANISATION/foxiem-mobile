import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, sizes, space } from '@/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
};

export function Chip({ label, selected = false, disabled = false, icon, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      <AppText variant="label" color={selected ? 'primary' : 'textPrimary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.touchMin,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  selected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  disabled: {
    opacity: 0.4,
  },
});
