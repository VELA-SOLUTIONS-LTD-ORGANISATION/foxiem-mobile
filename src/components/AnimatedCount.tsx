import { memo, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { formatNumber } from '@/format';
import { useTheme } from '@/theme';

type AnimatedCountProps = {
  value: number;
  locale: string;
  fontSize: number;
  color?: string;
  reduceMotion?: boolean;
  /** Optional lighter suffix such as "/3". */
  suffix?: string;
  suffixColor?: string;
  style?: StyleProp<ViewStyle>;
  /** Changes once per completed goal to trigger the restrained celebration. */
  celebrateKey?: number;
};

type Direction = 1 | -1;

type CharState = { current: string; previous: string; direction: Direction; generation: number };

const RollingChar = memo(function RollingChar({
  char,
  direction,
  textStyle,
  reduceMotion,
}: {
  char: string;
  direction: Direction;
  textStyle: TextStyle;
  reduceMotion: boolean;
}) {
  const [state, setState] = useState<CharState>({ current: char, previous: char, direction, generation: 0 });
  const [progress] = useState(() => new Animated.Value(1));

  if (state.current !== char) {
    setState({ current: char, previous: state.current, direction, generation: state.generation + 1 });
  }

  useEffect(() => {
    if (state.generation === 0) {
      return;
    }
    progress.stopAnimation();
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      easing: Easing.bezier(0.05, 0.7, 0.1, 1),
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion, state.generation]);

  const travel = (textStyle.fontSize ?? 40) * 0.55 * state.direction;
  const animating = state.current !== state.previous && !reduceMotion;

  return (
    <View>
      <Animated.Text
        allowFontScaling={false}
        style={[
          textStyle,
          animating && {
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }) }],
          },
        ]}
      >
        {state.current}
      </Animated.Text>
      {animating ? (
        <Animated.Text
          allowFontScaling={false}
          style={[
            textStyle,
            styles.overlay,
            {
              opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0, 0] }),
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] }) }],
            },
          ]}
        >
          {state.previous}
        </Animated.Text>
      ) : null}
    </View>
  );
});

/**
 * The Count Moment. Each changed digit rolls in the direction of the change; unchanged digits
 * stay still, so the number reads like a physical counter. Never blocks input: every change
 * restarts from the current frame on the native driver.
 */
export function AnimatedCount({
  value,
  locale,
  fontSize,
  color,
  reduceMotion = false,
  suffix,
  suffixColor,
  style,
  celebrateKey = 0,
}: AnimatedCountProps) {
  const theme = useTheme();
  const [tracked, setTracked] = useState<{ value: number; direction: Direction; generation: number }>({
    value,
    direction: 1,
    generation: 0,
  });
  const [scale] = useState(() => new Animated.Value(1));
  const [ring] = useState(() => new Animated.Value(0));

  if (tracked.value !== value) {
    setTracked({ value, direction: value > tracked.value ? 1 : -1, generation: tracked.generation + 1 });
  }

  useEffect(() => {
    if (tracked.generation === 0 || reduceMotion) {
      return;
    }
    scale.stopAnimation();
    scale.setValue(tracked.direction === 1 ? 1.035 : 0.985);
    Animated.spring(scale, { toValue: 1, stiffness: 420, damping: 22, mass: 0.6, useNativeDriver: true }).start();
  }, [reduceMotion, scale, tracked.direction, tracked.generation]);

  useEffect(() => {
    if (celebrateKey === 0 || reduceMotion) {
      return;
    }
    ring.setValue(0);
    Animated.timing(ring, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [celebrateKey, reduceMotion, ring]);

  const chars = formatNumber(value, locale).split('');
  const ink = color ?? theme.colors.ink;
  const lineHeight = Math.round(fontSize * 1.08);
  const textStyle: TextStyle = {
    ...theme.typography.numberRow,
    fontSize,
    lineHeight,
    letterSpacing: -fontSize * 0.02,
    color: ink,
  };

  return (
    <View style={[styles.row, style]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {celebrateKey > 0 && !reduceMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: fontSize * 1.9,
              height: fontSize * 1.9,
              borderRadius: fontSize,
              marginTop: -(fontSize * 1.9) / 2,
              borderColor: ink,
              opacity: ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.35] }) }],
            },
          ]}
        />
      ) : null}
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        {chars.map((char, index) => (
          <RollingChar
            key={chars.length - index}
            char={char}
            direction={tracked.direction}
            textStyle={textStyle}
            reduceMotion={reduceMotion}
          />
        ))}
        {suffix ? (
          <Animated.Text
            allowFontScaling={false}
            style={[textStyle, { color: suffixColor ?? theme.colors.inkTertiary, fontSize: Math.round(fontSize * 0.4), lineHeight }]}
          >
            {suffix}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  ring: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    borderWidth: 3,
  },
});
