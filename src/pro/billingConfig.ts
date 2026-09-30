/**
 * Store billing is configured only through public SDK keys (they are designed to ship in the app).
 * Set them in the EAS environment for production builds:
 *
 *   EXPO_PUBLIC_REVENUECAT_IOS_API_KEY      appl_…
 *   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY  goog_…
 *
 * Without a valid key no Pro surface is shown in a release build, and nothing pretends to sell.
 */

export type BillingPlatform = 'ios' | 'android';

/** Metro inlines `process.env.EXPO_PUBLIC_*` only when read as a literal member expression. */
const KEYS: Record<BillingPlatform, string | undefined> = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
};

const KEY_PREFIX: Record<BillingPlatform, string> = { ios: 'appl_', android: 'goog_' };

export type BillingKeyCheck = { valid: true; apiKey: string } | { valid: false; reason: 'missing' | 'wrongPlatform' | 'testKey' };

/** Rejects empty keys, keys for the other platform and RevenueCat Test Store keys (which must never ship). */
export function checkRevenueCatKey(platform: BillingPlatform, value: string | undefined, allowTestKey = false): BillingKeyCheck {
  const key = value?.trim();
  if (!key) {
    return { valid: false, reason: 'missing' };
  }
  if (key.startsWith('test_')) {
    return allowTestKey ? { valid: true, apiKey: key } : { valid: false, reason: 'testKey' };
  }
  if (!key.startsWith(KEY_PREFIX[platform])) {
    return { valid: false, reason: 'wrongPlatform' };
  }
  return { valid: true, apiKey: key };
}

export function getRevenueCatKey(platform: BillingPlatform): BillingKeyCheck {
  return checkRevenueCatKey(platform, KEYS[platform], __DEV__);
}

/** Development builds use the simulator unless real store sandbox testing is requested explicitly. */
export function storeEnabledInDevelopment(): boolean {
  return process.env.EXPO_PUBLIC_REVENUECAT_IN_DEV === '1';
}
