import { checkAccountConfig, normalizeApiUrl } from '../config';

const WEB = '1234567890-abcdef.apps.googleusercontent.com';
const IOS = '1234567890-ghijkl.apps.googleusercontent.com';

describe('normalizeApiUrl', () => {
  it('accepts an https origin and drops a trailing slash', () => {
    expect(normalizeApiUrl('https://api.foxiem.app/', false)).toBe('https://api.foxiem.app');
    expect(normalizeApiUrl('  https://api.foxiem.app ', false)).toBe('https://api.foxiem.app');
  });

  it('rejects plain http in release builds and allows only local hosts in development', () => {
    expect(normalizeApiUrl('http://api.foxiem.app', false)).toBeNull();
    expect(normalizeApiUrl('http://10.0.2.2:8080', false)).toBeNull();
    expect(normalizeApiUrl('http://10.0.2.2:8080', true)).toBe('http://10.0.2.2:8080');
    expect(normalizeApiUrl('http://localhost:8080', true)).toBe('http://localhost:8080');
    expect(normalizeApiUrl('http://evil.example', true)).toBeNull();
  });

  it('rejects empty values, paths, credentials and garbage', () => {
    for (const value of [undefined, '', '   ', 'api.foxiem.app', 'https://user:pw@api.foxiem.app', 'https://api.foxiem.app/v1', 'https://api.foxiem.app?x=1']) {
      expect(normalizeApiUrl(value, true)).toBeNull();
    }
  });
});

describe('checkAccountConfig', () => {
  const env = { apiUrl: 'https://api.foxiem.app', webClientId: WEB, iosClientId: IOS };

  it('is available on Android with the web client id and on iOS with both client ids', () => {
    expect(checkAccountConfig('android', { ...env, iosClientId: undefined }, false)).toEqual({
      available: true,
      apiUrl: 'https://api.foxiem.app',
      webClientId: WEB,
      iosClientId: null,
    });
    expect(checkAccountConfig('ios', env, false)).toMatchObject({ available: true, iosClientId: IOS });
  });

  it('stays off when anything is missing, so no account surface appears', () => {
    expect(checkAccountConfig('web', env, false)).toEqual({ available: false, reason: 'platform' });
    expect(checkAccountConfig('android', { ...env, apiUrl: undefined }, false)).toEqual({ available: false, reason: 'apiUrl' });
    expect(checkAccountConfig('android', { ...env, webClientId: undefined }, false)).toEqual({ available: false, reason: 'googleClient' });
    expect(checkAccountConfig('android', { ...env, webClientId: 'not-a-client-id' }, false)).toEqual({ available: false, reason: 'googleClient' });
    expect(checkAccountConfig('ios', { ...env, iosClientId: undefined }, false)).toEqual({ available: false, reason: 'googleClient' });
  });
});
