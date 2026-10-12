import { buildStoreScreenshotState, STORE_SCREENSHOT_TRACKER_ID } from '../storeScreenshotFixture';
import { isStoreScreenshotMode } from '../storeScreenshotMode';

describe('store screenshot fixture', () => {
  it('is off unless the explicit screenshot flag is set', () => {
    expect(isStoreScreenshotMode()).toBe(false);
  });

  it('builds the same anonymous trackers and reminder ids every time', () => {
    const now = new Date('2026-04-15T12:00:00.000Z');
    const first = buildStoreScreenshotState(now);
    const second = buildStoreScreenshotState(now);
    expect(first.trackers.map((tracker) => tracker.id)).toEqual([
      STORE_SCREENSHOT_TRACKER_ID,
      'tracker.store.coffee',
      'tracker.store.reading',
      'tracker.store.workout',
    ]);
    expect(first.events[STORE_SCREENSHOT_TRACKER_ID]?.length).toBeGreaterThan(20);
    expect(JSON.stringify(first)).toEqual(JSON.stringify(second));
    expect(first.preferences.analyticsConsent).toBe('denied');
    expect(first.reminders).toHaveLength(2);
    expect(first.reminders.every((reminder) => reminder.enabled)).toBe(true);
    expect(first.trackers[0]?.name).toBe('Water');
    expect(first.preferences.language).toBe('en');
  });

  it('localises sample tracker names to the screenshot language', () => {
    const now = new Date('2026-04-15T12:00:00.000Z');
    const turkish = buildStoreScreenshotState(now, 'tr');
    expect(turkish.preferences.language).toBe('tr');
    expect(turkish.trackers.map((tracker) => tracker.name)).toEqual(['Su', 'Kahve', 'Okuma', 'Antrenman']);
  });
});
