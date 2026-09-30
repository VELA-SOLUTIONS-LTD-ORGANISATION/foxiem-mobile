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

  it('ignores anything else', () => {
    for (const url of [null, undefined, '', 'https://foxiem.app/tracker/1', 'foxiem://tracker', 'foxiem://tracker/%E0%A4%A', 'foxiem://settings', 'other://home']) {
      expect(parseDeepLink(url)).toBeNull();
    }
  });
});
