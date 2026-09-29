import { Platform, TurboModuleRegistry } from 'react-native';

/**
 * Minimal, privacy-first measurement through Firebase Analytics (also used for Google Ads
 * conversions). Only allow-listed event names with enum parameters leave the device:
 * tracker names, notes, counts and history are never sent. Users can switch it off in
 * Settings → Privacy. Fail-open: a missing native module or provider error never reaches
 * product flows, and nothing is sent from Expo Go or tests.
 */

const FIREBASE_APP_TURBO_MODULE = 'NativeRNFBTurboApp';

const INTENTS = ['count', 'reach', 'limit', 'reduce', 'consistency'] as const;
const PLANS = ['monthly', 'yearly', 'lifetime'] as const;
const FEATURES = [
  'patterns',
  'crossTracker',
  'pace',
  'trends',
  'fullHistory',
  'weeklyReview',
  'monthlyReview',
  'multipleReminders',
  'smartReminders',
  'reports',
  'settings',
] as const;

export const ANALYTICS_EVENTS = {
  onboarding_complete: {},
  first_count: {},
  tracker_created: { intent: INTENTS, source: ['template', 'custom'] },
  reminder_enabled: { kind: ['tracker', 'general'], smart: ['yes', 'no'] },
  paywall_viewed: { feature: FEATURES },
  purchase_started: { plan: PLANS },
  purchase_completed: { plan: PLANS },
  review_viewed: { kind: ['weekly', 'monthly'] },
  data_exported: { kind: ['entries', 'report'] },
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;

export type AnalyticsParams<Name extends AnalyticsEventName> = {
  [Key in keyof (typeof ANALYTICS_EVENTS)[Name]]?: (typeof ANALYTICS_EVENTS)[Name][Key] extends readonly (infer V)[]
    ? V
    : never;
};

export type AnalyticsSink = {
  logEvent: (name: string, params?: Record<string, string>) => void | Promise<void>;
  setEnabled?: (enabled: boolean) => void | Promise<void>;
};

let enabled = true;
let testSink: AnalyticsSink | null = null;
let nativeSink: AnalyticsSink | null | undefined;

export function isFirebaseNativeAvailable(platform: typeof Platform.OS = Platform.OS): boolean {
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

/** Test seam: inject a sink so Jest never loads the native Firebase module. */
export function setAnalyticsSinkForTests(sink: AnalyticsSink | null): void {
  testSink = sink;
}

function loadSink(): AnalyticsSink | null {
  if (testSink) {
    return testSink;
  }
  if (nativeSink !== undefined) {
    return nativeSink;
  }
  if (!isFirebaseNativeAvailable()) {
    nativeSink = null;
    return null;
  }
  try {
    // Isolated require: Expo Go must never evaluate @react-native-firebase/*.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require('./firebaseAnalyticsNative') as { loadFirebaseAnalyticsSink: () => AnalyticsSink | null };
    nativeSink = native.loadFirebaseAnalyticsSink();
  } catch {
    nativeSink = null;
  }
  return nativeSink;
}

export function sanitizeParams(name: AnalyticsEventName, params?: Record<string, unknown>): Record<string, string> {
  const schema = ANALYTICS_EVENTS[name] as Record<string, readonly string[]>;
  const out: Record<string, string> = {};
  if (!params) {
    return out;
  }
  for (const [key, value] of Object.entries(params)) {
    const allowed = schema[key];
    if (allowed && typeof value === 'string' && allowed.includes(value)) {
      out[key] = value;
    }
  }
  return out;
}

export async function setAnalyticsEnabled(next: boolean): Promise<void> {
  enabled = next;
  try {
    await loadSink()?.setEnabled?.(next);
  } catch {
    // Best effort.
  }
}

export async function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  params?: AnalyticsParams<Name>,
): Promise<void> {
  if (!enabled) {
    return;
  }
  try {
    const sink = loadSink();
    if (!sink) {
      return;
    }
    const clean = sanitizeParams(name, params as Record<string, unknown> | undefined);
    await sink.logEvent(name, Object.keys(clean).length > 0 ? clean : undefined);
  } catch {
    // Measurement is best-effort; never surface a provider error into product flows.
  }
}
