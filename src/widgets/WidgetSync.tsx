import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { proAccessUntil } from '@/pro/entitlement';
import { usePro } from '@/pro/ProProvider';
import { usePreferences, useTrackerStore } from '@/state';
import { readJson, writeJson } from '@/storage/appStorage';
import { STORAGE_KEYS } from '@/storage/keys';

import { getSurfaceBridge } from './bridge';
import { drainInbox, trimLedger } from './inbox';
import { buildWidgetSnapshot } from './snapshot';
import { loadWatchModule } from './watch';

const PUBLISH_DELAY_MS = 350;

/**
 * Keeps widgets and the Apple Watch in step with the app. Renders nothing.
 *
 * - Publishes a fresh snapshot whenever what a widget shows could have changed.
 * - Applies presses recorded outside the app, exactly once, whenever the app opens or the Watch reports one.
 */
export function WidgetSync() {
  const { t } = useTranslation();
  const store = useTrackerStore();
  const { language, weekStart, preferences } = usePreferences();
  const pro = usePro();
  const bridge = getSurfaceBridge();
  const ready = store.hydrated && pro.hydrated;

  const applied = useRef<string[]>([]);
  const ledgerLoaded = useRef(false);
  const [version, setVersion] = useState(0);
  const [foregrounded, setForegrounded] = useState(0);
  const draining = useRef<Promise<void>>(Promise.resolve());
  const { applyExternalTaps } = store;

  const drain = useCallback(() => {
    if (!bridge.supported) {
      return draining.current;
    }
    draining.current = draining.current.then(async () => {
      try {
        const result = await drainInbox({
          bridge: bridge.inbox,
          ledger: {
            read: async () => {
              if (!ledgerLoaded.current) {
                applied.current = (await readJson<string[]>(STORAGE_KEYS.widgetApplied)) ?? [];
                ledgerLoaded.current = true;
              }
              return applied.current;
            },
            write: (ids) => writeJson(STORAGE_KEYS.widgetApplied, ids),
          },
          apply: (actions) => {
            // The ledger and the store change together, so a snapshot can never carry one without the other.
            const count = applyExternalTaps(actions);
            applied.current = trimLedger([...applied.current, ...actions.map((action) => action.id)]);
            return count;
          },
          now: Date.now(),
        });
        applied.current = result.ledger;
        if (result.seen > 0) {
          setVersion((current) => current + 1);
        }
      } catch {
        // Presses stay in the inbox and are picked up on the next attempt.
      }
    });
    return draining.current;
  }, [applyExternalTaps, bridge]);

  useEffect(() => {
    if (ready) {
      void drain();
    }
  }, [drain, ready]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setForegrounded((current) => current + 1);
        if (ready) {
          void drain();
        }
      }
    });
    return () => subscription.remove();
  }, [drain, ready]);

  // The Watch reports presses while the app is running; apply them straight away.
  useEffect(() => {
    if (!ready || !bridge.supported) {
      return undefined;
    }
    const subscription = loadWatchModule()?.addListener?.('onInbox', () => void drain());
    return () => subscription?.remove();
  }, [bridge.supported, drain, ready]);

  useEffect(() => {
    if (!ready || !bridge.supported) {
      return undefined;
    }
    const timer = setTimeout(() => {
      const snapshot = buildWidgetSnapshot({
        trackers: store.trackers,
        events: store.events,
        now: new Date(),
        weekStart,
        isPro: pro.isPro,
        proUntil: proAccessUntil(pro.entitlement),
        language,
        chosenTrackerId: preferences.widgetTrackerId,
        applied: applied.current,
        t: t as unknown as (key: string, options?: Record<string, unknown>) => string,
      });
      void bridge.publishSnapshot(snapshot).catch(() => undefined);
    }, PUBLISH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    bridge,
    foregrounded,
    language,
    preferences.widgetTrackerId,
    pro.isPro,
    pro.entitlement,
    ready,
    store.events,
    store.trackers,
    t,
    version,
    weekStart,
  ]);

  return null;
}
