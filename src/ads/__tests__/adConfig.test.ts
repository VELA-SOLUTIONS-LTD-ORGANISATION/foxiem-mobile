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

  it('has production banner units configured for both platforms', () => {
    expect(hasProductionBannerUnitsConfigured()).toBe(true);
    expect(PRODUCTION_BANNER_UNITS.ios.statistics).toMatch(/^ca-app-pub-/);
    expect(PRODUCTION_BANNER_UNITS.ios.activityHistory).toMatch(/^ca-app-pub-/);
    expect(PRODUCTION_BANNER_UNITS.android.statistics).toMatch(/^ca-app-pub-/);
    expect(PRODUCTION_BANNER_UNITS.android.activityHistory).toMatch(/^ca-app-pub-/);
  });

  it('selects platform-specific production IDs in release mode', () => {
    expect(getBannerUnitId('statistics', { platform: 'ios', isDev: false })).toBe(
      PRODUCTION_BANNER_UNITS.ios.statistics,
    );
    expect(getBannerUnitId('activityHistory', { platform: 'ios', isDev: false })).toBe(
      PRODUCTION_BANNER_UNITS.ios.activityHistory,
    );
    expect(getBannerUnitId('statistics', { platform: 'android', isDev: false })).toBe(
      PRODUCTION_BANNER_UNITS.android.statistics,
    );
    expect(getBannerUnitId('activityHistory', { platform: 'android', isDev: false })).toBe(
      PRODUCTION_BANNER_UNITS.android.activityHistory,
    );
  });

  it('never crosses platform unit IDs', () => {
    const iosStats = getBannerUnitId('statistics', { platform: 'ios', isDev: false });
    const androidStats = getBannerUnitId('statistics', { platform: 'android', isDev: false });
    expect(iosStats).not.toBe(androidStats);
    expect(iosStats).toBe(PRODUCTION_BANNER_UNITS.ios.statistics);
    expect(androidStats).toBe(PRODUCTION_BANNER_UNITS.android.statistics);
  });

  it('fails closed when a production unit is cleared', () => {
    const previous = PRODUCTION_BANNER_UNITS.ios.statistics;
    PRODUCTION_BANNER_UNITS.ios.statistics = '';
    expect(getBannerUnitId('statistics', { platform: 'ios', isDev: false })).toBeNull();
    expect(hasProductionBannerUnitsConfigured()).toBe(false);
    PRODUCTION_BANNER_UNITS.ios.statistics = previous;
  });

  it('recognizes Google sample App IDs as distinct from Foxiem production App IDs', () => {
    expect(
      usesGoogleSampleAppIds(GOOGLE_SAMPLE_APP_IDS.android, GOOGLE_SAMPLE_APP_IDS.ios),
    ).toBe(true);
    expect(
      usesGoogleSampleAppIds(
        'ca-app-pub-3249455013386377~1127078474',
        'ca-app-pub-3249455013386377~1517960718',
      ),
    ).toBe(false);
  });
});
