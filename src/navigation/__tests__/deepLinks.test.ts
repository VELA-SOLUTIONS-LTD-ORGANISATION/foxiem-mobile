import { parseDeepLink } from '../deepLinks';

describe('parseDeepLink', () => {
  it('opens a tracker', () => {
    expect(parseDeepLink('foxiem://tracker/tracker.abc123')).toEqual({ kind: 'tracker', trackerId: 'tracker.abc123' });
    expect(parseDeepLink('foxiem://tracker/a%20b')).toEqual({ kind: 'tracker', trackerId: 'a b' });
    expect(parseDeepLink('FOXIEM://Tracker/x/')).toEqual({ kind: 'tracker', trackerId: 'x' });
  });

  it('opens Home and the paywall, keeping only known features', () => {
    expect(parseDeepLink('foxiem://home')).toEqual({ kind: 'home' });
    expect(parseDeepLink('foxiem://pro')).toEqual({ kind: 'paywall' });
    expect(parseDeepLink('foxiem://pro?feature=widgets')).toEqual({ kind: 'paywall', feature: 'widgets' });
    expect(parseDeepLink('foxiem://pro?feature=bogus')).toEqual({ kind: 'paywall' });
  });

  it('ignores screenshot fixtures unless screenshot mode is on', () => {
    const previous = process.env.EXPO_PUBLIC_STORE_SCREENSHOTS;
    delete process.env.EXPO_PUBLIC_STORE_SCREENSHOTS;
    try {
      expect(parseDeepLink('foxiem://_dev/store/home')).toBeNull();
      expect(parseDeepLink('foxiem://_dev/store/paywall')).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.EXPO_PUBLIC_STORE_SCREENSHOTS;
      } else {
        process.env.EXPO_PUBLIC_STORE_SCREENSHOTS = previous;
      }
    }
  });

  it('opens screenshot scenes only in screenshot mode', () => {
    const previous = process.env.EXPO_PUBLIC_STORE_SCREENSHOTS;
    process.env.EXPO_PUBLIC_STORE_SCREENSHOTS = '1';
    try {
      expect(parseDeepLink('foxiem://_dev/store/home')).toEqual({ kind: 'storeScreenshot', scene: 'home' });
      expect(parseDeepLink('foxiem://_dev/store/tracker')).toEqual({ kind: 'storeScreenshot', scene: 'tracker' });
      expect(parseDeepLink('foxiem://_dev/store/insights')).toEqual({ kind: 'storeScreenshot', scene: 'insights' });
      expect(parseDeepLink('foxiem://_dev/store/reminders')).toEqual({ kind: 'storeScreenshot', scene: 'reminders' });
      expect(parseDeepLink('foxiem://_dev/store/widgets')).toEqual({ kind: 'storeScreenshot', scene: 'widgets' });
      expect(parseDeepLink('foxiem://_dev/store/paywall')).toEqual({ kind: 'storeScreenshot', scene: 'paywall' });
      expect(parseDeepLink('foxiem://_dev/store/home?lang=tr-TR')).toEqual({
        kind: 'storeScreenshot',
        scene: 'home',
        lang: 'tr-TR',
      });
      expect(parseDeepLink('http://127.0.0.1:8091/#/_dev/store/home?lang=tr-TR')).toEqual({
        kind: 'storeScreenshot',
        scene: 'home',
        lang: 'tr-TR',
      });
      expect(
        parseDeepLink('http://127.0.0.1:8091/?scene=home&lang=tr-TR#/_dev/store/home?lang=tr-TR'),
      ).toEqual({
        kind: 'storeScreenshot',
        scene: 'home',
        lang: 'tr-TR',
      });
      expect(parseDeepLink('foxiem://_dev/store/secret')).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.EXPO_PUBLIC_STORE_SCREENSHOTS;
      } else {
        process.env.EXPO_PUBLIC_STORE_SCREENSHOTS = previous;
      }
    }
  });

  it('never opens screenshot links in a release bundle', () => {
    const flags = globalThis as unknown as { __DEV__: boolean };
    const original = flags.__DEV__;
    const previous = process.env.EXPO_PUBLIC_STORE_SCREENSHOTS;
    flags.__DEV__ = false;
    process.env.EXPO_PUBLIC_STORE_SCREENSHOTS = '1';
    try {
      expect(parseDeepLink('foxiem://_dev/store/home')).toBeNull();
    } finally {
      flags.__DEV__ = original;
      if (previous === undefined) {
        delete process.env.EXPO_PUBLIC_STORE_SCREENSHOTS;
      } else {
        process.env.EXPO_PUBLIC_STORE_SCREENSHOTS = previous;
      }
    }
  });

  it('ignores anything else', () => {
    for (const url of [null, undefined, '', 'https://foxiem.app/tracker/1', 'foxiem://tracker', 'foxiem://tracker/%E0%A4%A', 'foxiem://settings', 'other://home']) {
      expect(parseDeepLink(url)).toBeNull();
    }
  });
});
