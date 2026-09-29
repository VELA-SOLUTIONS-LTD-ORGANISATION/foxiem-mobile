import type { AnalyticsSink } from './analytics';

type ModularAnalytics = {
  getAnalytics?: () => unknown;
  logEvent?: (analytics: unknown, name: string, params?: Record<string, string>) => Promise<void>;
  setAnalyticsCollectionEnabled?: (analytics: unknown, enabled: boolean) => Promise<void>;
  default?: () => {
    logEvent: (name: string, params?: Record<string, string>) => Promise<void>;
    setAnalyticsCollectionEnabled?: (enabled: boolean) => Promise<void>;
  };
};

/**
 * Isolated so Expo Go never evaluates @react-native-firebase/* unless the
 * NativeRNFBTurboApp TurboModule is already present.
 */
export function loadFirebaseAnalyticsSink(): AnalyticsSink | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const analyticsModule = require('@react-native-firebase/analytics') as ModularAnalytics;

  if (typeof analyticsModule.getAnalytics === 'function' && typeof analyticsModule.logEvent === 'function') {
    const analytics = analyticsModule.getAnalytics();
    const { logEvent, setAnalyticsCollectionEnabled } = analyticsModule;
    return {
      logEvent: (name, params) => logEvent(analytics, name, params),
      setEnabled: (enabled) => setAnalyticsCollectionEnabled?.(analytics, enabled),
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
  return {
    logEvent: (name, params) => analytics.logEvent(name, params),
    setEnabled: (enabled) => analytics.setAnalyticsCollectionEnabled?.(enabled),
  };
}
