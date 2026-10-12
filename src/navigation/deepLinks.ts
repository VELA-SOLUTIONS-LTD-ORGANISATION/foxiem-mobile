import { isProFeature, type ProFeature } from '@/pro/features';
import { URL_SCHEME } from '@/widgets/model';

const STORE_SCREENSHOT_SCENES = ['home', 'tracker', 'insights', 'reminders', 'widgets', 'paywall'] as const;
export type StoreScreenshotScene = (typeof STORE_SCREENSHOT_SCENES)[number];

/** Where a `foxiem://` link (from a widget, the Watch or a notification) should land. */
export type DeepLinkTarget =
  | { kind: 'home' }
  | { kind: 'tracker'; trackerId: string }
  | { kind: 'paywall'; feature?: ProFeature }
  | { kind: 'storeScreenshot'; scene: StoreScreenshotScene; lang?: string };

function storeScreenshotModeEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_STORE_SCREENSHOTS === '1';
}

function parsePathAndQuery(rest: string): DeepLinkTarget | null {
  const [pathPart, queryPart = ''] = rest.split('?', 2);
  const segments = pathPart
    .split('#')[0]
    .split('/')
    .filter((segment) => segment.length > 0);
  const [head, arg] = segments;

  switch (head?.toLowerCase()) {
    case 'home':
      return { kind: 'home' };
    case 'tracker': {
      if (!arg) {
        return null;
      }
      try {
        const trackerId = decodeURIComponent(arg);
        return trackerId ? { kind: 'tracker', trackerId } : null;
      } catch {
        return null;
      }
    }
    case 'pro': {
      const feature = new URLSearchParams(queryPart.split('#')[0]).get('feature');
      return isProFeature(feature) ? { kind: 'paywall', feature } : { kind: 'paywall' };
    }
    case '_dev': {
      if (!storeScreenshotModeEnabled() || arg?.toLowerCase() !== 'store') {
        return null;
      }
      const scene = segments[2]?.toLowerCase();
      if (!scene || !(STORE_SCREENSHOT_SCENES as readonly string[]).includes(scene)) {
        return null;
      }
      const params = new URLSearchParams(queryPart.split('#')[0]);
      const lang = params.get('lang') ?? params.get('locale');
      return {
        kind: 'storeScreenshot',
        scene: scene as StoreScreenshotScene,
        ...(lang ? { lang } : {}),
      };
    }
    default:
      return null;
  }
}

/**
 * Parse a link. Unknown hosts, other schemes and malformed input return null and are ignored, so a bad
 * link can never navigate somewhere unexpected.
 *   foxiem://tracker/<id>   foxiem://pro?feature=widgets   foxiem://home
 * Screenshot mode also accepts Expo web hashes:  http://localhost/#/_dev/store/home?lang=en-GB
 */
export function parseDeepLink(url: string | null | undefined): DeepLinkTarget | null {
  if (!url) {
    return null;
  }
  const prefix = `${URL_SCHEME}://`;
  if (url.toLowerCase().startsWith(prefix)) {
    return parsePathAndQuery(url.slice(prefix.length));
  }
  if (!storeScreenshotModeEnabled()) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : '';
    const rest = hash.startsWith('/') || hash.startsWith('_dev') ? hash.replace(/^\//, '') : '';
    if (!rest) {
      return null;
    }
    return parsePathAndQuery(rest);
  } catch {
    return null;
  }
}
