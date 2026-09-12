import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, sizes, space } from '@/theme';

type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <AppText
              variant="label"
              color={selected ? 'primary' : 'textSecondary'}
              align="center"
              numberOfLines={2}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: space[1],
    gap: space[1],
  },
  option: {
    flex: 1,
    minHeight: sizes.touchMin,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.surface,
  },
});
