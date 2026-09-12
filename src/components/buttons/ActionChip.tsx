import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, sizes, space } from '@/theme';

type ActionChipProps = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export function ActionChip({
  label,
  onPress,
  selected = false,
  destructive = false,
  disabled = false,
  icon,
}: ActionChipProps) {
  return (
    <Pressable
      role="button"
      aria-disabled={disabled}
      aria-selected={selected}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        destructive && styles.destructive,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
      <AppText
        variant="label"
        color={destructive ? 'error' : selected ? 'primary' : 'textPrimary'}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.touchMin,
    borderRadius: radius.pill,
    paddingHorizontal: space[4],
    backgroundColor: colors.surfaceSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  selected: {
    backgroundColor: colors.primarySoft,
  },
  destructive: {
    backgroundColor: colors.errorSoft,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
});
