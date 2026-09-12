jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-GB' }],
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(async () => undefined),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
}));

jest.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 'Inter_400Regular',
  Inter_500Medium: 'Inter_500Medium',
  Inter_600SemiBold: 'Inter_600SemiBold',
  Inter_700Bold: 'Inter_700Bold',
  useFonts: () => [true],
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({
    granted: true,
    status: 'granted',
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({
    granted: true,
    status: 'granted',
    canAskAgain: true,
  })),
  scheduleNotificationAsync: jest.fn(async () => `notif-${Math.random().toString(36).slice(2, 8)}`),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3 },
  PermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNDETERMINED: 'undetermined' },
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
}));

jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');

  const AdsConsentPrivacyOptionsRequirementStatus = {
    UNKNOWN: 'UNKNOWN',
    REQUIRED: 'REQUIRED',
    NOT_REQUIRED: 'NOT_REQUIRED',
  };

  const AdsConsentStatus = {
    UNKNOWN: 'UNKNOWN',
    REQUIRED: 'REQUIRED',
    NOT_REQUIRED: 'NOT_REQUIRED',
    OBTAINED: 'OBTAINED',
  };

  const initialize = jest.fn(async () => []);
  const mobileAds = jest.fn(() => ({ initialize }));

  return {
    __esModule: true,
    default: mobileAds,
    MobileAds: mobileAds,
    TestIds: {
      BANNER: 'ca-app-pub-3940256099942544/6300978111',
      ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/9214589741',
    },
    BannerAdSize: {
      INLINE_ADAPTIVE_BANNER: 'INLINE_ADAPTIVE_BANNER',
      BANNER: 'BANNER',
    },
    BannerAd: ({ unitId }: { unitId: string }) =>
      React.createElement(View, { testID: `banner-ad-${unitId}` }),
    AdsConsent: {
      gatherConsent: jest.fn(async () => ({
        status: AdsConsentStatus.NOT_REQUIRED,
        canRequestAds: true,
        privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
        isConsentFormAvailable: false,
      })),
      getConsentInfo: jest.fn(async () => ({
        status: AdsConsentStatus.NOT_REQUIRED,
        canRequestAds: true,
        privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
        isConsentFormAvailable: false,
      })),
      showForm: jest.fn(async () => ({
        status: AdsConsentStatus.OBTAINED,
        canRequestAds: true,
        privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        isConsentFormAvailable: true,
      })),
      showPrivacyOptionsForm: jest.fn(async () => ({
        status: AdsConsentStatus.OBTAINED,
        canRequestAds: true,
        privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        isConsentFormAvailable: true,
      })),
      loadAndShowConsentFormIfRequired: jest.fn(async () => ({
        status: AdsConsentStatus.OBTAINED,
        canRequestAds: true,
        privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
        isConsentFormAvailable: true,
      })),
      requestInfoUpdate: jest.fn(async () => ({
        status: AdsConsentStatus.NOT_REQUIRED,
        canRequestAds: true,
        privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
        isConsentFormAvailable: false,
      })),
    },
    AdsConsentPrivacyOptionsRequirementStatus,
    AdsConsentStatus,
  };
});
