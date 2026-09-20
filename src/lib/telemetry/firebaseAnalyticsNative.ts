import type { AdsConversionSink } from './adsConversions';

/**
 * Isolated so Expo Go never evaluates @react-native-firebase/* unless the
 * NativeRNFBTurboApp TurboModule is already present.
 */
export function loadFirebaseAnalyticsSink(): AdsConversionSink | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const analyticsModule = require('@react-native-firebase/analytics') as {
    getAnalytics?: () => unknown;
    logEvent?: (
      analytics: unknown,
      name: string,
      params?: Record<string, string>,
    ) => Promise<void>;
    default?: () => { logEvent: (name: string, params?: Record<string, string>) => Promise<void> };
  };

  if (
    typeof analyticsModule.getAnalytics === 'function' &&
    typeof analyticsModule.logEvent === 'function'
  ) {
    const analytics = analyticsModule.getAnalytics();
    const logEvent = analyticsModule.logEvent;
    return {
      logEvent: (name, params) => logEvent(analytics, name, params),
    };
  }

  const factory = analyticsModule.default;
  if (typeof factory !== 'function') {
    return null;
  }
  const analytics = factory();
  if (!analytics || typeof analytics.logEvent !== 'function') {
    return null;
  }
  return analytics;
}
