import { setAnalyticsEnabled, setAnalyticsSinkForTests } from '../analytics';
import { createScreenTracker, durationBucket } from '../screenTracking';

describe('screen tracking', () => {
  const logEvent = jest.fn();

  beforeEach(async () => {
    logEvent.mockClear();
    setAnalyticsSinkForTests({ logEvent });
    await setAnalyticsEnabled(true);
  });

  afterEach(async () => {
    await setAnalyticsEnabled(false);
    setAnalyticsSinkForTests(null);
  });

  it('buckets durations coarsely', () => {
    expect(durationBucket(1000)).toBe('lt5s');
    expect(durationBucket(10_000)).toBe('s5to15');
    expect(durationBucket(30_000)).toBe('s15to60');
    expect(durationBucket(120_000)).toBe('m1to5');
    expect(durationBucket(400_000)).toBe('gt5m');
  });

  it('logs a view on entry and time on exit, ignoring unknown routes', async () => {
    let time = 0;
    const tracker = createScreenTracker(() => time);
    tracker.onRoute('HomeTab');
    time = 20_000;
    tracker.onRoute('not-a-screen');
    tracker.onRoute('Paywall');
    await Promise.resolve();
    expect(logEvent.mock.calls).toEqual([
      ['screen_view', { screen_name: 'HomeTab' }],
      ['screen_time', { screen_name: 'HomeTab', duration: 's15to60' }],
      ['screen_view', { screen_name: 'Paywall' }],
    ]);
  });

  it('sends nothing without consent', async () => {
    await setAnalyticsEnabled(false);
    createScreenTracker().onRoute('HomeTab');
    expect(logEvent).not.toHaveBeenCalled();
  });
});
