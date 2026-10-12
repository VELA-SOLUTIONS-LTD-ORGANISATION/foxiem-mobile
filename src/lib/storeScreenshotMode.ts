/**
 * Store screenshot fixtures. Production EAS must never set EXPO_PUBLIC_STORE_SCREENSHOTS.
 * Release JS has `__DEV__ === false`, so this stays off even if the flag is present by mistake.
 */
export function isStoreScreenshotMode(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_STORE_SCREENSHOTS === '1';
}
