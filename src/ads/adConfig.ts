import { Platform } from 'react-native';

/**
 * Official Google sample App IDs (reference / detection helpers only).
 * Shipping App IDs live in `app.json` → `react-native-google-mobile-ads` plugin.
 * @see https://developers.google.com/admob/android/quick-start
 * @see https://developers.google.com/admob/ios/quick-start
 */
export const GOOGLE_SAMPLE_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
} as const;

/**
 * Official Google banner test ad unit.
 * Hardcoded so adConfig never imports react-native-google-mobile-ads at bundle load
 * (that import crashes Expo Go via TurboModuleRegistry.getEnforcing).
 * @see https://developers.google.com/admob/android/test-ads
 */
export const GOOGLE_TEST_BANNER_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

export type BannerPlacement = 'statistics' | 'activityHistory' | 'home';

type PlatformBannerUnits = {
  statistics: string;
  activityHistory: string;
  home: string;
};

/**
 * Real Foxiem banner Ad Unit IDs from AdMob console (banner format only).
 * Empty strings fail closed (no ad). Never use the wrong platform's unit.
 */
export const PRODUCTION_BANNER_UNITS: {
  ios: PlatformBannerUnits;
  android: PlatformBannerUnits;
} = {
  ios: {
    statistics: 'ca-app-pub-3249455013386377/4723929748',
    activityHistory: 'ca-app-pub-3249455013386377/3370098436',
    // Dedicated Home unit not created yet — reuse Statistics banner, never invent IDs.
    home: 'ca-app-pub-3249455013386377/4723929748',
  },
  android: {
    statistics: 'ca-app-pub-3249455013386377/8663174751',
    activityHistory: 'ca-app-pub-3249455013386377/4815042040',
    home: 'ca-app-pub-3249455013386377/8663174751',
  },
};

export function isNativeMobileAdsPlatform(platform: typeof Platform.OS = Platform.OS): boolean {
  return platform === 'ios' || platform === 'android';
}

/**
 * Returns the banner unit ID for a placement, or null when ads must not request.
 * Development always uses official test banner ID — never live production units in __DEV__.
 */
export function getBannerUnitId(
  placement: BannerPlacement,
  options?: { platform?: typeof Platform.OS; isDev?: boolean },
): string | null {
  const platform = options?.platform ?? Platform.OS;
  const isDev = options?.isDev ?? __DEV__;

  if (!isNativeMobileAdsPlatform(platform)) {
    return null;
  }

  if (isDev) {
    return GOOGLE_TEST_BANNER_UNIT_ID;
  }

  const units =
    platform === 'ios' ? PRODUCTION_BANNER_UNITS.ios : PRODUCTION_BANNER_UNITS.android;
  const unitId = units[placement]?.trim() ?? '';
  return unitId.length > 0 ? unitId : null;
}

export function hasProductionBannerUnitsConfigured(): boolean {
  const all = [
    PRODUCTION_BANNER_UNITS.ios.statistics,
    PRODUCTION_BANNER_UNITS.ios.activityHistory,
    PRODUCTION_BANNER_UNITS.ios.home,
    PRODUCTION_BANNER_UNITS.android.statistics,
    PRODUCTION_BANNER_UNITS.android.activityHistory,
    PRODUCTION_BANNER_UNITS.android.home,
  ];
  return all.every((id) => id.trim().length > 0);
}

export function usesGoogleSampleAppIds(androidAppId: string, iosAppId: string): boolean {
  return (
    androidAppId === GOOGLE_SAMPLE_APP_IDS.android && iosAppId === GOOGLE_SAMPLE_APP_IDS.ios
  );
}
