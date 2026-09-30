/**
 * Accounts are optional and only exist when a build is configured for them. Set these in the EAS
 * environment (they are public identifiers, not secrets):
 *
 *   EXPO_PUBLIC_API_URL                  https://<api-host>          (the Foxiem backend behind Cloudflare)
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     <id>.apps.googleusercontent.com   (OAuth client of type "Web")
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     <id>.apps.googleusercontent.com   (OAuth client of type "iOS")
 *
 * On iOS, Sign in with Apple is offered alongside Google (App Store guideline 4.8). The backend must
 * list the Google client ids in FOXIEM_GOOGLE_CLIENT_IDS and the bundle id in FOXIEM_APPLE_CLIENT_IDS.
 * Without a valid configuration the Account section is not shown and nothing is sent anywhere.
 */

export type AccountPlatform = 'ios' | 'android';

export type AccountConfig =
  | { available: true; apiUrl: string; webClientId: string; iosClientId: string | null }
  | { available: false; reason: 'platform' | 'apiUrl' | 'googleClient' };

/** Metro inlines `process.env.EXPO_PUBLIC_*` only when read as a literal member expression. */
const ENV = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

const GOOGLE_CLIENT_ID = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i;

/** Returns the base URL without a trailing slash, or null. Release builds accept https only. */
export function normalizeApiUrl(value: string | undefined, allowInsecureLocal: boolean): string | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (raw.includes('@') || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    return null;
  }
  if (url.protocol === 'https:') {
    return url.origin;
  }
  if (allowInsecureLocal && url.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname)) {
    return url.origin;
  }
  return null;
}

export function checkAccountConfig(
  platform: string,
  env: { apiUrl?: string; webClientId?: string; iosClientId?: string },
  allowInsecureLocal: boolean,
): AccountConfig {
  if (platform !== 'ios' && platform !== 'android') {
    return { available: false, reason: 'platform' };
  }
  const apiUrl = normalizeApiUrl(env.apiUrl, allowInsecureLocal);
  if (!apiUrl) {
    return { available: false, reason: 'apiUrl' };
  }
  const webClientId = env.webClientId?.trim() ?? '';
  const iosClientId = env.iosClientId?.trim() ?? '';
  // iOS needs the iOS Google client so Continue with Google works next to Sign in with Apple (4.8).
  if (!GOOGLE_CLIENT_ID.test(webClientId) || (platform === 'ios' && !GOOGLE_CLIENT_ID.test(iosClientId))) {
    return { available: false, reason: 'googleClient' };
  }
  return { available: true, apiUrl, webClientId, iosClientId: iosClientId || null };
}

export function getAccountConfig(platform: string): AccountConfig {
  return checkAccountConfig(platform, ENV, __DEV__);
}
