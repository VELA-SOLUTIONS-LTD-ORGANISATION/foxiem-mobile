import { Linking } from 'react-native';
import { type ReactNode, useEffect, useState } from 'react';

import { parseDeepLink } from '@/navigation/deepLinks';

import { screenshotLaunchHref } from './storeScreenshotLaunch';
import { ensureStoreScreenshotFixture } from './storeScreenshotFixture';
import { storeLocaleToAppLanguage } from './storeScreenshotLocales';
import { isStoreScreenshotMode } from './storeScreenshotMode';

/** Writes screenshot storage before any store hydrates, so onboarding never appears. */
export function ScreenshotFixtureGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isStoreScreenshotMode());

  useEffect(() => {
    if (ready) {
      return;
    }
    void (async () => {
      try {
        const url = screenshotLaunchHref(await Linking.getInitialURL());
        const target = parseDeepLink(url);
        const language = target?.kind === 'storeScreenshot' ? storeLocaleToAppLanguage(target.lang) : 'en';
        await ensureStoreScreenshotFixture(new Date(), language);
        if (typeof document !== 'undefined') {
          try {
            const href = url ?? (typeof window !== 'undefined' ? window.location.href : '');
            const os = new URL(href).searchParams.get('os');
            if (os === 'ios' || os === 'android') {
              document.documentElement.dataset.storeOs = os;
            }
          } catch {
            document.documentElement.dataset.storeOs = 'ios';
          }
        }
      } catch {
        await ensureStoreScreenshotFixture().catch(() => undefined);
      } finally {
        setReady(true);
      }
    })();
  }, [ready]);

  if (!ready) {
    return null;
  }
  return children;
}
