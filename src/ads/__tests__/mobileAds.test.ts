import {
  getMobileAdsInitializeCallCountForTests,
  initializeMobileAdsOnce,
  resetMobileAdsInitializationForTests,
} from '@/ads/mobileAds';
import { resetGoogleMobileAdsCacheForTests } from '@/ads/nativeAvailability';
import mobileAds from 'react-native-google-mobile-ads';

describe('mobileAds initialization', () => {
  beforeEach(() => {
    resetMobileAdsInitializationForTests();
    resetGoogleMobileAdsCacheForTests();
    jest.clearAllMocks();
  });

  it('initializes the SDK only once across repeated calls', async () => {
    await Promise.all([
      initializeMobileAdsOnce(),
      initializeMobileAdsOnce(),
      initializeMobileAdsOnce(),
    ]);

    expect(getMobileAdsInitializeCallCountForTests()).toBe(1);
    expect(mobileAds).toHaveBeenCalledTimes(1);
    expect(mobileAds().initialize).toHaveBeenCalledTimes(1);
  });
});
