import { Platform } from 'react-native';

/**
 * Crash reporting via @sentry/react-native.
 *
 * Privacy: sendDefaultPii off, replay off, traces/profiles sample rate 0.
 * beforeSend keeps only an opaque user id. Product analytics stays on Firebase
 * (consent-gated); Sentry is crash-only. Without EXPO_PUBLIC_SENTRY_DSN this is a no-op.
 */

type SentryModule = {
  init(options: Record<string, unknown>): void;
  captureException(error: unknown, hint?: Record<string, unknown>): void;
  setUser(user: { id: string } | null): void;
  wrap<T>(component: T): T;
};

type SentryEvent = {
  user?: { id?: string; [key: string]: unknown } | null;
  request?: unknown;
  exception?: { values?: Array<{ type?: string }> };
};

let initialised = false;
let sentryModule: SentryModule | null = null;

function loadSentry(): SentryModule | null {
  try {
    // Lazy require: Jest / Expo Go fail open without loading native code at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as SentryModule;
  } catch {
    return null;
  }
}

function isWatchdogTermination(event: SentryEvent): boolean {
  return (event.exception?.values ?? []).some((value) => value?.type === 'WatchdogTermination');
}

/** Drop PII-ish user fields and request payloads; silence OS watchdog noise. */
export function scrubSentryEvent(event: SentryEvent): SentryEvent | null {
  if (isWatchdogTermination(event)) {
    return null;
  }
  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : null;
  }
  if ('request' in event) {
    delete event.request;
  }
  return event;
}

function dsn(): string | null {
  const value = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  return value && value.length > 0 ? value : null;
}

/** Call once at process start (index.ts). Safe to call again; no-ops without a DSN. */
export function initSentry(): void {
  if (initialised) {
    return;
  }
  const value = dsn();
  if (!value) {
    return;
  }
  const sentry = loadSentry();
  if (!sentry?.init) {
    return;
  }
  try {
    sentry.init({
      dsn: value,
      environment: __DEV__ ? 'development' : 'production',
      sendDefaultPii: false,
      enableAutoSessionTracking: true,
      attachStacktrace: true,
      tracesSampleRate: 0,
      profilesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      beforeSend: scrubSentryEvent,
      initialScope: {
        tags: { platform: Platform.OS },
      },
    });
    sentryModule = sentry;
    initialised = true;
  } catch {
    initialised = false;
    sentryModule = null;
  }
}

export function captureException(error: unknown, source = 'unknown'): void {
  if (!initialised || !sentryModule) {
    return;
  }
  try {
    sentryModule.captureException(error, { tags: { source } });
  } catch {
    // Crash reporting must never break the app.
  }
}

/** Opaque account id only — never email/name. */
export function setSentryUser(userId: string | null): void {
  if (!initialised || !sentryModule) {
    return;
  }
  try {
    sentryModule.setUser(userId ? { id: userId } : null);
  } catch {
    // best-effort
  }
}

/** Wrap the root component when the native module is present; otherwise return as-is. */
export function wrapRoot<T>(component: T): T {
  const sentry = sentryModule ?? loadSentry();
  if (!sentry?.wrap || !dsn()) {
    return component;
  }
  try {
    return sentry.wrap(component);
  } catch {
    return component;
  }
}
