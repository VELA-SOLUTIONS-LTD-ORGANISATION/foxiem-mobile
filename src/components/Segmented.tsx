import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

type Option<T extends string | number> = { value: T; label: string; accessibilityLabel?: string };

type SegmentedProps<T extends string | number> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

export function Segmented<T extends string | number>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
  const theme = useTheme();
  // Four or more segments on a 320 pt phone leave ~60 pt per label; long single words need the room.
  const dense = options.length >= 4;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, dense && styles.trackDense, { backgroundColor: theme.colors.sunken, borderRadius: theme.radius.md }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              dense && styles.optionDense,
              { borderRadius: theme.radius.sm },
              selected && {
                backgroundColor: theme.colors.selected,
                borderColor: theme.colors.line,
              },
            ]}
          >
            <Text
              variant="label"
              tone={selected ? 'ink' : 'inkSecondary'}
              align="center"
              numberOfLines={2}
              style={dense ? styles.labelDense : undefined}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  trackDense: {
    gap: 2,
  },
  option: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  optionDense: {
    paddingHorizontal: 3,
  },
  labelDense: {
    fontSize: 13,
    lineHeight: 17,
  },
});
