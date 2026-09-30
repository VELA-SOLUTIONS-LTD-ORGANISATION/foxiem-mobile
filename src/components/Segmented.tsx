import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useReducedMotion } from '@/hooks';
import { useTheme } from '@/theme';

import { SELECT_MS } from './motion';
import { Text } from './Text';

type Option<T extends string | number> = { value: T; label: string; accessibilityLabel?: string };

type SegmentedProps<T extends string | number> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

const PADDING = 4;

/** Segmented choice with a thumb that slides to the selected option (it jumps with Reduce Motion). */
export function Segmented<T extends string | number>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  // Four or more segments on a 320 pt phone leave ~60 pt per label; long single words need the room.
  const dense = options.length >= 4;
  const gap = dense ? 2 : 4;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(index));
  const segment = width > 0 ? (width - PADDING * 2 - gap * (options.length - 1)) / options.length : 0;

  useEffect(() => {
    if (reduceMotion) {
      position.setValue(index);
      return undefined;
    }
    const animation = Animated.timing(position, {
      toValue: index,
      duration: SELECT_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, position, reduceMotion]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  // Interpolation needs at least two points; a single option never moves.
  const translateX =
    options.length > 1
      ? position.interpolate({
          inputRange: options.map((_, i) => i),
          outputRange: options.map((_, i) => i * (segment + gap)),
        })
      : 0;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={[styles.track, { gap, backgroundColor: theme.colors.sunken, borderRadius: theme.radius.md }]}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: segment,
              left: PADDING,
              backgroundColor: theme.colors.selected,
              borderColor: theme.colors.line,
              borderRadius: theme.radius.sm,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}
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
              // Until the thumb is measured (first frame) the selected option paints its own background.
              selected && segment === 0 && { backgroundColor: theme.colors.selected, borderColor: theme.colors.line },
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
    padding: PADDING,
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    borderWidth: StyleSheet.hairlineWidth,
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
