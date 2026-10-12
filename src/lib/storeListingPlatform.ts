import { Platform } from 'react-native';

import { isStoreScreenshotMode } from './storeScreenshotMode';

/** Store listing copy (App Store vs Play) for screenshot captures that run on web. */
export function storeListingPlatform(): 'ios' | 'android' {
  if (isStoreScreenshotMode() && typeof document !== 'undefined') {
    const hint = document.documentElement.dataset.storeOs;
    if (hint === 'ios' || hint === 'android') {
      return hint;
    }
  }
  return Platform.OS === 'ios' ? 'ios' : 'android';
}
