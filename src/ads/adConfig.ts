import { Platform } from 'react-native';

/**
 * Official Google sample App IDs for development / pre-production native builds.
 * Replace with real Foxiem AdMob App IDs before monetized store release.
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

export type BannerPlacement = 'statistics' | 'activityHistory';

type PlatformBannerUnits = {
  statistics: string;
  activityHistory: string;
};

/**
 * Real Foxiem banner Ad Unit IDs — leave empty until supplied from AdMob console.
 * Do NOT invent publisher IDs. Empty production units fail closed (no ad).
 */
export const PRODUCTION_BANNER_UNITS: {
  ios: PlatformBannerUnits;
  android: PlatformBannerUnits;
} = {
  ios: {
    statistics: '',
    activityHistory: '',
  },
  android: {
    statistics: '',
    activityHistory: '',
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
    PRODUCTION_BANNER_UNITS.android.statistics,
    PRODUCTION_BANNER_UNITS.android.activityHistory,
  ];
  return all.every((id) => id.trim().length > 0);
}

export function usesGoogleSampleAppIds(androidAppId: string, iosAppId: string): boolean {
  return (
    androidAppId === GOOGLE_SAMPLE_APP_IDS.android && iosAppId === GOOGLE_SAMPLE_APP_IDS.ios
  );
}
