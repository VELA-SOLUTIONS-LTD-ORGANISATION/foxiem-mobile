import { isNativeMobileAdsPlatform } from './adConfig';
import { getGoogleMobileAds, isGoogleMobileAdsNativeAvailable } from './nativeAvailability';

let initializePromise: Promise<boolean> | null = null;
let initializeCallCount = 0;

/**
 * Initialize Google Mobile Ads SDK at most once for the process lifetime.
 * Returns false on unsupported platforms, Expo Go, or failure (fail closed).
 */
export function initializeMobileAdsOnce(): Promise<boolean> {
  if (!isNativeMobileAdsPlatform() || !isGoogleMobileAdsNativeAvailable()) {
    return Promise.resolve(false);
  }

  const gma = getGoogleMobileAds();
  if (!gma) {
    return Promise.resolve(false);
  }

  if (!initializePromise) {
    initializeCallCount += 1;
    initializePromise = gma
      .default()
      .initialize()
      .then(() => true)
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn('[Foxiem Ads] Mobile Ads initialize failed', error);
        }
        initializePromise = null;
        return false;
      });
  }

  return initializePromise;
}

/** Test helper — do not use in production UI. */
export function getMobileAdsInitializeCallCountForTests(): number {
  return initializeCallCount;
}

/** Test helper — reset singleton between tests. */
export function resetMobileAdsInitializationForTests(): void {
  initializePromise = null;
  initializeCallCount = 0;
}
