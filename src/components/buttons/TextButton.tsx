import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { sizes } from '@/theme';

type TextButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function TextButton({
  title,
  onPress,
  disabled = false,
  destructive = false,
}: TextButtonProps) {
  return (
    <Pressable
      role="button"
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.base, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <AppText variant="label" color={destructive ? 'error' : 'primary'}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.touchMin,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
