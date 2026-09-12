import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, sizes, space } from '@/theme';

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
};

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
}: StepperProps) {
  const decrease = () => {
    onChange(Math.max(min, value - step));
  };

  const increase = () => {
    onChange(Math.min(max, value + step));
  };

  return (
    <View style={styles.row}>
      <Pressable
        role="button"
        aria-label="Decrease"
        disabled={disabled || value <= min}
        onPress={decrease}
        style={({ pressed }) => [
          styles.control,
          pressed && !disabled && styles.pressed,
          (disabled || value <= min) && styles.disabled,
        ]}
      >
        <AppText variant="h3">-</AppText>
      </Pressable>
      <View style={styles.value}>
        <AppText variant="displayNumber">{value}</AppText>
      </View>
      <Pressable
        role="button"
        aria-label="Increase"
        disabled={disabled || value >= max}
        onPress={increase}
        style={({ pressed }) => [
          styles.control,
          pressed && !disabled && styles.pressed,
          (disabled || value >= max) && styles.disabled,
        ]}
      >
        <AppText variant="h3">+</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  control: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: sizes.controlLg,
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  disabled: {
    opacity: 0.4,
  },
});
