import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import type { TrackerColor } from '@/domain/types';
import { useTheme } from '@/theme';

type MeterProps = {
  color: TrackerColor;
  /** value / target. May exceed 1 for Stay under. */
  ratio: number;
  kind: 'reach' | 'limit';
  height?: number;
  reduceMotion?: boolean;
};

/** Share of the bar before the limit cap; the rest shows honest overflow. */
const LIMIT_SPAN = 0.84;

/**
 * Reach: fills toward the target. Stay under: fills toward a cap drawn as a small post;
 * beyond it the overflow shows in the caution tone instead of turning the whole bar red.
 */
export function Meter({ color, ratio, kind, height = 6, reduceMotion = false }: MeterProps) {
  const theme = useTheme();
  const tone = theme.tone(color);
  const [fill] = useState(() => new Animated.Value(0));
  const [overflow] = useState(() => new Animated.Value(0));

  const clamped = Math.max(0, ratio);
  const main = kind === 'reach' ? Math.min(1, clamped) : Math.min(1, clamped) * LIMIT_SPAN;
  const extra = kind === 'limit' && clamped > 1 ? Math.min(1, clamped - 1) * (1 - LIMIT_SPAN) : 0;

  useEffect(() => {
    const config = { duration: reduceMotion ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    Animated.parallel([
      Animated.timing(fill, { toValue: main, ...config }),
      Animated.timing(overflow, { toValue: extra, ...config }),
    ]).start();
  }, [extra, fill, main, overflow, reduceMotion]);

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: theme.colors.track }]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: kind === 'limit' && clamped >= 1 ? theme.colors.caution : tone.solid,
            borderRadius: height / 2,
            transform: [{ scaleX: fill }],
          },
        ]}
      />
      {kind === 'limit' ? (
        <>
          <Animated.View
            style={[
              styles.overflow,
              {
                left: `${LIMIT_SPAN * 100}%`,
                width: `${(1 - LIMIT_SPAN) * 100}%`,
                backgroundColor: theme.colors.caution,
                opacity: 0.55,
                transform: [{ scaleX: overflow.interpolate({ inputRange: [0, 1 - LIMIT_SPAN], outputRange: [0, 1] }) }],
              },
            ]}
          />
          <View
            style={[
              styles.cap,
              {
                left: `${LIMIT_SPAN * 100}%`,
                height: height + 8,
                top: -4,
                backgroundColor: theme.colors.inkSecondary,
              },
            ]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transformOrigin: 'left',
  },
  overflow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    transformOrigin: 'left',
  },
  cap: {
    position: 'absolute',
    width: 2,
    marginLeft: -1,
    borderRadius: 1,
  },
});
