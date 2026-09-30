import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

export const OVERLAY_ENTER_MS = 260;
export const OVERLAY_EXIT_MS = 190;
/** With Reduce Motion the overlay only fades, quickly; nothing travels across the screen. */
export const OVERLAY_REDUCED_MS = 120;

/**
 * Shared enter/exit motion for sheets and dialogs. `mounted` stays true until the exit finishes, so the
 * native Modal is removed only after the scrim has faded; `progress` runs 0 → 1.
 *
 * Re-opening mid-exit reverses from wherever the animation is, and a burst of open/close calls never queues
 * animations: each change stops the previous one.
 */
export function useOverlayMotion(visible: boolean, reduceMotion: boolean): { mounted: boolean; progress: Animated.Value } {
  const [hidden, setHidden] = useState(!visible);
  const [previous, setPrevious] = useState(visible);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));

  // Showing again cancels a pending "fully hidden" state (adjusted while rendering, not in an effect).
  if (visible !== previous) {
    setPrevious(visible);
    if (visible) {
      setHidden(false);
    }
  }
  const mounted = visible || !hidden;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? OVERLAY_REDUCED_MS : visible ? OVERLAY_ENTER_MS : OVERLAY_EXIT_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setHidden(true);
      }
    });
    return () => animation.stop();
  }, [progress, reduceMotion, visible]);

  return { mounted, progress };
}

/** Whether a drag ending here should dismiss a bottom sheet. */
export function shouldDismissSheet(distance: number, velocity: number): boolean {
  return distance > 96 || (distance > 24 && velocity > 0.9);
}
