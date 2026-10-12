export { isStoreScreenshotMode } from '@/lib/storeScreenshotMode';

export const STORE_SCREENSHOT_SCENES = ['home', 'tracker', 'insights', 'reminders', 'widgets', 'paywall'] as const;
export type StoreScreenshotScene = (typeof STORE_SCREENSHOT_SCENES)[number];

export function isStoreScreenshotScene(value: string | undefined): value is StoreScreenshotScene {
  return value != null && (STORE_SCREENSHOT_SCENES as readonly string[]).includes(value);
}
