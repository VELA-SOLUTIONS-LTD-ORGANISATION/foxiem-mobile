import {
  isFirebaseNativeAvailable,
  logAdsConversion,
  sanitizeAdsConversionParams,
  setAdsConversionSinkForTests,
} from '@/lib/telemetry/adsConversions';

describe('sanitizeAdsConversionParams', () => {
  it('drops every property for no-property conversions', () => {
    expect(
      sanitizeAdsConversionParams('onboarding_complete', {
        email: 'user@example.com',
        name: 'Ada',
      }),
    ).toEqual({});
    expect(
      sanitizeAdsConversionParams('first_count', {
        count: '12',
        note: 'private',
      }),
    ).toEqual({});
  });
});

describe('logAdsConversion', () => {
  afterEach(() => {
    setAdsConversionSinkForTests(null);
  });

  it('forwards sanitized events to the sink', async () => {
    const logEvent = jest.fn();
    setAdsConversionSinkForTests({ logEvent });

    await logAdsConversion('onboarding_complete');
    await logAdsConversion('first_count', { count: '1' });

    expect(logEvent).toHaveBeenCalledWith('onboarding_complete', undefined);
    expect(logEvent).toHaveBeenCalledWith('first_count', undefined);
  });

  it('swallows sink failures so product flows never throw', async () => {
    setAdsConversionSinkForTests({
      logEvent: () => {
        throw new Error('firebase down');
      },
    });

    await expect(logAdsConversion('onboarding_complete')).resolves.toBeUndefined();
  });

  it('is a no-op when no native module or test sink is present', async () => {
    expect(isFirebaseNativeAvailable('web')).toBe(false);
    await expect(logAdsConversion('first_count')).resolves.toBeUndefined();
  });
});
