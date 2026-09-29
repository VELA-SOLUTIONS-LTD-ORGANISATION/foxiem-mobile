import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'plain' | 'outlined';
  disabled?: boolean;
  size?: number;
  color?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** Always at least 48 × 48 so it is easy to hit. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  disabled = false,
  size = 24,
  color,
  testID,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: theme.radius.md },
        variant === 'outlined' && {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.line,
        },
        pressed && { backgroundColor: theme.colors.sunken },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? theme.colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
