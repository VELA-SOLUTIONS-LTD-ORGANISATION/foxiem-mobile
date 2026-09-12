import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppSwitch } from '@/components/forms/AppSwitch';
import { AppText } from '@/components/typography/AppText';
import { colors, sizes, space } from '@/theme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  value?: string;
  chevron?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  destructive?: boolean;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export function ListRow({
  title,
  subtitle,
  leading,
  value,
  chevron = false,
  toggleValue,
  onToggleChange,
  destructive = false,
  disabled = false,
  selected = false,
  accessibilityLabel,
  onPress,
}: ListRowProps) {
  const content = (
    <View style={[styles.row, disabled && styles.disabled]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.copy}>
        <AppText variant="body" color={destructive ? 'error' : 'textPrimary'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="body" color="textSecondary">
          {value}
        </AppText>
      ) : null}
      {selected ? (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      ) : null}
      {onToggleChange ? (
        <AppSwitch
          value={Boolean(toggleValue)}
          onValueChange={onToggleChange}
          disabled={disabled}
          accessibilityLabel={title}
        />
      ) : null}
      {chevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (onPress && onToggleChange) {
    return (
      <View style={[styles.row, disabled && styles.disabled]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          accessibilityState={{ disabled, selected }}
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [styles.copy, pressed && !disabled && styles.pressedCopy]}
        >
          <AppText variant="body" color={destructive ? 'error' : 'textPrimary'}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="textSecondary">
              {subtitle}
            </AppText>
          ) : null}
        </Pressable>
        <AppSwitch
          value={Boolean(toggleValue)}
          onValueChange={onToggleChange}
          disabled={disabled}
          accessibilityLabel={title}
        />
      </View>
    );
  }

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => pressed && !disabled && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.controlLg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[2],
  },
  leading: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: space[1],
  },
  pressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  pressedCopy: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
