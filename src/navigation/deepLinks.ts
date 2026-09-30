import { isProFeature, type ProFeature } from '@/pro/features';
import { URL_SCHEME } from '@/widgets/model';

/** Where a `foxiem://` link (from a widget, the Watch or a notification) should land. */
export type DeepLinkTarget =
  | { kind: 'home' }
  | { kind: 'tracker'; trackerId: string }
  | { kind: 'paywall'; feature?: ProFeature };

/**
 * Parse a link. Unknown hosts, other schemes and malformed input return null and are ignored, so a bad
 * link can never navigate somewhere unexpected.
 *   foxiem://tracker/<id>   foxiem://pro?feature=widgets   foxiem://home
 */
export function parseDeepLink(url: string | null | undefined): DeepLinkTarget | null {
  if (!url) {
    return null;
  }
  const prefix = `${URL_SCHEME}://`;
  if (!url.toLowerCase().startsWith(prefix)) {
    return null;
  }
  const rest = url.slice(prefix.length);
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
    default:
      return null;
  }
}
