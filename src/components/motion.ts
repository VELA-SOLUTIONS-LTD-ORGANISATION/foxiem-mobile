import { useEffect, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Platform } from 'react-native';

/**
 * Small, shared motion helpers. The rules: motion explains a change (something appeared, moved or was
 * selected), never decorates; nothing queues, so the latest state always wins; Reduce Motion removes
 * movement and keeps only instant state changes.
 */

export const SELECT_MS = 170;
export const LAYOUT_MS = 220;

const LAYOUT_CONFIG = {
  duration: LAYOUT_MS,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
} as const;

/**
 * Animate whatever the next render adds, removes or moves (a tracker created or archived, a section opened).
 * Call it right before the state change. It replaces any pending layout animation instead of stacking.
 */
export function animateNextLayout(reduceMotion: boolean): void {
  if (reduceMotion || Platform.OS === 'web') {
    return;
  }
  LayoutAnimation.configureNext(LAYOUT_CONFIG);
}

/** A 0 → 1 value that follows a boolean. Stops the previous run first, so rapid toggles never queue. */
export function useAnimatedFlag(flag: boolean, reduceMotion: boolean, options: { native?: boolean; ms?: number } = {}): Animated.Value {
  const { native = true, ms = SELECT_MS } = options;
  const [value] = useState(() => new Animated.Value(flag ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      value.setValue(flag ? 1 : 0);
      return undefined;
    }
    const animation = Animated.timing(value, {
      toValue: flag ? 1 : 0,
      duration: ms,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
    });
    animation.start();
    return () => animation.stop();
  }, [flag, ms, native, reduceMotion, value]);
  return value;
}
