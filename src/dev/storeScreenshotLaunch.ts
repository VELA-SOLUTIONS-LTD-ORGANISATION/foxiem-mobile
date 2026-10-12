import { Platform } from 'react-native';

import type { DeepLinkTarget } from '@/navigation/deepLinks';

let lastHandledUrl: string | null = null;

/** Expo web `getInitialURL` can omit the hash; the browser location still has the screenshot route. */
export function screenshotLaunchHref(linkingUrl: string | null | undefined): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const href = window.location.href;
    if (href.includes('_dev/store')) {
      return href;
    }
  }
  return linkingUrl ?? null;
}

/** The same launch VIEW is delivered as getInitialURL and as a `url` event; only one may navigate. */
export function claimScreenshotUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }
  if (lastHandledUrl === url) {
    return false;
  }
  lastHandledUrl = url;
  return true;
}

export function screenshotUrlAlreadyClaimed(url: string | null | undefined): boolean {
  return Boolean(url) && lastHandledUrl === url;
}

export function isStoreScreenshotTarget(target: DeepLinkTarget | null): target is Extract<DeepLinkTarget, { kind: 'storeScreenshot' }> {
  return target?.kind === 'storeScreenshot';
}
