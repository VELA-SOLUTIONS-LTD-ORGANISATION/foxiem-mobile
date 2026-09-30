import { DEFAULT_PREFERENCES, parsePreferences } from '@/storage/preferencesStorage';

describe('analytics consent', () => {
  it('collects nothing until the person has chosen', async () => {
    let analytics!: typeof import('../analytics');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      analytics = require('../analytics');
    });
    const logEvent = jest.fn();
    analytics.setAnalyticsSinkForTests({ logEvent });

    expect(analytics.isAnalyticsEnabled()).toBe(false);
    await analytics.trackEvent('first_count');
    expect(logEvent).not.toHaveBeenCalled();

    await analytics.setAnalyticsEnabled(true);
    await analytics.trackEvent('first_count');
    expect(logEvent).toHaveBeenCalledTimes(1);

    await analytics.setAnalyticsEnabled(false);
    await analytics.trackEvent('first_count');
    expect(logEvent).toHaveBeenCalledTimes(1);
    analytics.setAnalyticsSinkForTests(null);
  });

  it('tells the native sink when consent is granted and withdrawn', async () => {
    let analytics!: typeof import('../analytics');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      analytics = require('../analytics');
    });
    const setEnabled = jest.fn();
    analytics.setAnalyticsSinkForTests({ logEvent: jest.fn(), setEnabled });
    await analytics.setAnalyticsEnabled(true);
    await analytics.setAnalyticsEnabled(false);
    expect(setEnabled.mock.calls).toEqual([[true], [false]]);
    analytics.setAnalyticsSinkForTests(null);
  });

  it('starts unknown and only ever trusts an explicit stored choice', () => {
    expect(DEFAULT_PREFERENCES.analyticsConsent).toBe('unknown');
    expect(parsePreferences(null).analyticsConsent).toBe('unknown');
    expect(parsePreferences({ analyticsConsent: 'granted' }).analyticsConsent).toBe('granted');
    expect(parsePreferences({ analyticsConsent: 'denied' }).analyticsConsent).toBe('denied');
    for (const junk of [true, 1, 'yes', null, {}]) {
      expect(parsePreferences({ analyticsConsent: junk }).analyticsConsent).toBe('unknown');
    }
  });
});
