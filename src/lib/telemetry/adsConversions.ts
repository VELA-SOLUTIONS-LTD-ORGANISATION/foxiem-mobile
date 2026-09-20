import { Platform, TurboModuleRegistry } from 'react-native';

/**
 * Ads attribution conversions — a third telemetry lane, separate from crash reporting
 * and optional product analytics.
 *
 * These events go to Firebase Analytics so Google Ads can bid for quality users
 * (onboarding completed, first count). They are PII-free and never include
 * profile fields, notes, or counter values. They are not gated by a product
 * analytics opt-in.
 *
 * Fail-open: a missing native module, Expo Go, or provider error never throws into
 * product flows. Native events only reach Ads after an EAS rebuild with
 * `google-services.json`.
 */

const FIREBASE_APP_TURBO_MODULE = 'NativeRNFBTurboApp';

/**
 * True only when React Native Firebase's native binary is present.
 * Expo Go and web return false — do not require() the JS package there.
 */
export function isFirebaseNativeAvailable(
  platform: typeof Platform.OS = Platform.OS,
): boolean {
  if (platform !== 'ios' && platform !== 'android') {
    return false;
  }

  if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID != null) {
    return false;
  }

  try {
    return TurboModuleRegistry.get(FIREBASE_APP_TURBO_MODULE) != null;
  } catch {
    return false;
  }
}

export const ADS_CONVERSION_EVENTS = {
  onboarding_complete: [],
  first_count: [],
} as const;

export type AdsConversionName = keyof typeof ADS_CONVERSION_EVENTS;

export type AdsConversionProperties = Record<string, string | undefined>;

export const MAX_ADS_PROPERTY_LENGTH = 120;

export type AdsConversionSink = {
  logEvent: (name: AdsConversionName, params?: Record<string, string>) => void | Promise<void>;
};

let testSink: AdsConversionSink | null = null;

/** Test seam: inject a sink so Jest never loads the native Firebase module. */
export function setAdsConversionSinkForTests(sink: AdsConversionSink | null): void {
  testSink = sink;
}

export function sanitizeAdsConversionParams(
  name: AdsConversionName,
  properties?: AdsConversionProperties,
): Record<string, string> {
  const allowed = new Set<string>(ADS_CONVERSION_EVENTS[name]);
  const out: Record<string, string> = {};
  if (!properties) {
    return out;
  }
  for (const [key, raw] of Object.entries(properties)) {
    if (!allowed.has(key) || typeof raw !== 'string') {
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    out[key] =
      trimmed.length > MAX_ADS_PROPERTY_LENGTH
        ? trimmed.slice(0, MAX_ADS_PROPERTY_LENGTH)
        : trimmed;
  }
  return out;
}

function loadNativeAnalytics(): AdsConversionSink | null {
  if (!isFirebaseNativeAvailable()) {
    return null;
  }

  try {
    // Isolated require: Expo Go must never evaluate @react-native-firebase/*.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require('./firebaseAnalyticsNative') as {
      loadFirebaseAnalyticsSink: () => AdsConversionSink | null;
    };
    return native.loadFirebaseAnalyticsSink();
  } catch {
    return null;
  }
}

export async function logAdsConversion(
  name: AdsConversionName,
  properties?: AdsConversionProperties,
): Promise<void> {
  try {
    const sink = testSink ?? loadNativeAnalytics();
    if (!sink) {
      return;
    }
    const params = sanitizeAdsConversionParams(name, properties);
    await sink.logEvent(name, Object.keys(params).length > 0 ? params : undefined);
  } catch {
    // Attribution is best-effort; never surface a provider error into product flows.
  }
}
