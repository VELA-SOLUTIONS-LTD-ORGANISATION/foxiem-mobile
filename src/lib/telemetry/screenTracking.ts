import { SCREENS, trackEvent } from './analytics';

type ScreenName = (typeof SCREENS)[number];
type Duration = 'lt5s' | 's5to15' | 's15to60' | 'm1to5' | 'gt5m';

export function durationBucket(ms: number): Duration {
  if (ms < 5_000) {
    return 'lt5s';
  }
  if (ms < 15_000) {
    return 's5to15';
  }
  if (ms < 60_000) {
    return 's15to60';
  }
  if (ms < 300_000) {
    return 'm1to5';
  }
  return 'gt5m';
}

function isScreen(name: string | undefined): name is ScreenName {
  return name !== undefined && (SCREENS as readonly string[]).includes(name);
}

/**
 * Tracks which screen is in the foreground and for how long. Emits `screen_view` on entry and
 * `screen_time` (coarse bucket) on exit or when the app goes to the background. All sends are
 * consent-gated inside trackEvent.
 */
export function createScreenTracker(now: () => number = Date.now) {
  let current: ScreenName | null = null;
  let since = 0;

  const flush = () => {
    if (current) {
      void trackEvent('screen_time', { screen_name: current, duration: durationBucket(now() - since) });
    }
  };

  return {
    /** Call with the leaf route name whenever navigation state changes. */
    onRoute(name: string | undefined) {
      if (!isScreen(name) || name === current) {
        return;
      }
      flush();
      current = name;
      since = now();
      void trackEvent('screen_view', { screen_name: name });
    },
    onBackground() {
      flush();
      since = now();
    },
    onForeground() {
      since = now();
      if (current) {
        void trackEvent('screen_view', { screen_name: current });
      }
    },
  };
}
