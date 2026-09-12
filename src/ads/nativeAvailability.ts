import { Platform, TurboModuleRegistry } from 'react-native';

/**
 * True only when the Google Mobile Ads native binary is present.
 * Expo Go and web return false — ads fail closed; Foxiem still runs.
 */
export function isGoogleMobileAdsNativeAvailable(
  platform: typeof Platform.OS = Platform.OS,
): boolean {
  if (platform !== 'ios' && platform !== 'android') {
    return false;
  }

  // Jest mocks the JS package; native TurboModules are absent in Node.
  if (typeof process !== 'undefined' && process.env.JEST_WORKER_ID != null) {
    return true;
  }

  try {
    return TurboModuleRegistry.get('RNGoogleMobileAdsModule') != null;
  } catch {
    return false;
  }
}

type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

let cachedModule: GoogleMobileAdsModule | null | undefined;

/**
 * Lazily require the AdMob package only after the native module is confirmed.
 * Never call this from Expo Go — require() would throw getEnforcing.
 */
export function getGoogleMobileAds(): GoogleMobileAdsModule | null {
  if (!isGoogleMobileAdsNativeAvailable()) {
    return null;
  }

  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('react-native-google-mobile-ads') as GoogleMobileAdsModule;
    return cachedModule;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Foxiem Ads] Google Mobile Ads JS module unavailable', error);
    }
    cachedModule = null;
    return null;
  }
}

/** Test helper */
export function resetGoogleMobileAdsCacheForTests(): void {
  cachedModule = undefined;
}
