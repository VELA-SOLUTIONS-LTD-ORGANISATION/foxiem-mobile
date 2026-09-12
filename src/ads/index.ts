export {
  getBannerUnitId,
  GOOGLE_SAMPLE_APP_IDS,
  GOOGLE_TEST_BANNER_UNIT_ID,
  hasProductionBannerUnitsConfigured,
  isNativeMobileAdsPlatform,
  PRODUCTION_BANNER_UNITS,
  usesGoogleSampleAppIds,
  type BannerPlacement,
} from './adConfig';
export { AdsProvider, useAds } from './AdsProvider';
export { AdBanner } from './components/AdBanner';
export { bootstrapAdsConsent, presentPrivacyOptionsForm } from './consent';
export {
  getMobileAdsInitializeCallCountForTests,
  initializeMobileAdsOnce,
  resetMobileAdsInitializationForTests,
} from './mobileAds';
export {
  getGoogleMobileAds,
  isGoogleMobileAdsNativeAvailable,
} from './nativeAvailability';
