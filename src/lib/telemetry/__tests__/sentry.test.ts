import { scrubSentryEvent } from '@/lib/telemetry/sentry';

describe('scrubSentryEvent', () => {
  it('keeps only an opaque user id', () => {
    const scrubbed = scrubSentryEvent({
      user: { id: 'user-1', email: 'a@b.com', username: 'fox' },
      request: { url: 'https://api.example/secret' },
    });
    expect(scrubbed).toEqual({ user: { id: 'user-1' } });
  });

  it('drops WatchdogTermination events', () => {
    expect(
      scrubSentryEvent({
        exception: { values: [{ type: 'WatchdogTermination' }] },
      }),
    ).toBeNull();
  });
});
