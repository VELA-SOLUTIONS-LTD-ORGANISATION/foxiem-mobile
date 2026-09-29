import { sanitizeParams, setAnalyticsEnabled, setAnalyticsSinkForTests, trackEvent } from '@/lib/telemetry/analytics';

describe('privacy-first analytics', () => {
  const logEvent = jest.fn();

  beforeEach(async () => {
    logEvent.mockClear();
    setAnalyticsSinkForTests({ logEvent });
    await setAnalyticsEnabled(true);
  });

  afterAll(() => {
    setAnalyticsSinkForTests(null);
  });

  it('keeps only allow-listed enum values, so personal text can never leave the device', () => {
    expect(
      sanitizeParams('tracker_created', {
        intent: 'reach',
        source: 'template',
        name: 'Insulin shots',
        notes: 'private',
        count: 42,
      }),
    ).toEqual({ intent: 'reach', source: 'template' });
    expect(sanitizeParams('tracker_created', { intent: 'My secret tracker' })).toEqual({});
  });

  it('sends sanitised events and nothing at all once the user opts out', async () => {
    await trackEvent('tracker_created', { intent: 'limit', source: 'custom' });
    expect(logEvent).toHaveBeenCalledWith('tracker_created', { intent: 'limit', source: 'custom' });

    await setAnalyticsEnabled(false);
    await trackEvent('first_count');
    expect(logEvent).toHaveBeenCalledTimes(1);
  });

  it('never lets a provider failure reach product code', async () => {
    logEvent.mockImplementationOnce(() => {
      throw new Error('provider down');
    });
    await expect(trackEvent('first_count')).resolves.toBeUndefined();
  });
});
