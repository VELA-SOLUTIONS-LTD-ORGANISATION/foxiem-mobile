import {
  getBannerUnitId,
  GOOGLE_SAMPLE_APP_IDS,
  GOOGLE_TEST_BANNER_UNIT_ID,
  hasProductionBannerUnitsConfigured,
  PRODUCTION_BANNER_UNITS,
  usesGoogleSampleAppIds,
} from '@/ads/adConfig';

describe('adConfig', () => {
  it('returns official Google test banner ID in development on native platforms', () => {
    expect(getBannerUnitId('statistics', { platform: 'ios', isDev: true })).toBe(
      GOOGLE_TEST_BANNER_UNIT_ID,
    );
    expect(getBannerUnitId('activityHistory', { platform: 'android', isDev: true })).toBe(
      GOOGLE_TEST_BANNER_UNIT_ID,
    );
  });

  it('returns null on web', () => {
    expect(getBannerUnitId('statistics', { platform: 'web', isDev: true })).toBeNull();
    expect(getBannerUnitId('statistics', { platform: 'web', isDev: false })).toBeNull();
  });

  it('fails closed in production when unit IDs are empty', () => {
    expect(PRODUCTION_BANNER_UNITS.ios.statistics).toBe('');
    expect(getBannerUnitId('statistics', { platform: 'ios', isDev: false })).toBeNull();
    expect(hasProductionBannerUnitsConfigured()).toBe(false);
  });

  it('selects platform-specific production IDs when configured', () => {
    const previousIos = { ...PRODUCTION_BANNER_UNITS.ios };
    const previousAndroid = { ...PRODUCTION_BANNER_UNITS.android };
    PRODUCTION_BANNER_UNITS.ios.statistics = 'ca-app-pub-1111111111111111/2222222222';
    PRODUCTION_BANNER_UNITS.ios.activityHistory = 'ca-app-pub-1111111111111111/3333333333';
    PRODUCTION_BANNER_UNITS.android.statistics = 'ca-app-pub-4444444444444444/5555555555';
    PRODUCTION_BANNER_UNITS.android.activityHistory = 'ca-app-pub-4444444444444444/6666666666';

    expect(getBannerUnitId('statistics', { platform: 'ios', isDev: false })).toBe(
      'ca-app-pub-1111111111111111/2222222222',
    );
    expect(getBannerUnitId('statistics', { platform: 'android', isDev: false })).toBe(
      'ca-app-pub-4444444444444444/5555555555',
    );

    PRODUCTION_BANNER_UNITS.ios.statistics = previousIos.statistics;
    PRODUCTION_BANNER_UNITS.ios.activityHistory = previousIos.activityHistory;
    PRODUCTION_BANNER_UNITS.android.statistics = previousAndroid.statistics;
    PRODUCTION_BANNER_UNITS.android.activityHistory = previousAndroid.activityHistory;
  });

  it('recognizes Google sample App IDs used for development native config', () => {
    expect(
      usesGoogleSampleAppIds(GOOGLE_SAMPLE_APP_IDS.android, GOOGLE_SAMPLE_APP_IDS.ios),
    ).toBe(true);
  });
});
