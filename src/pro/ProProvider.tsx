import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import type { SimulatedAdapter } from '@/dev/simulatedAdapter';
import { i18n } from '@/i18n';
import { trackEvent } from '@/lib/telemetry/analytics';
import { readJson, writeJson } from '@/storage/appStorage';
import { STORAGE_KEYS } from '@/storage/keys';

import type { ProPlan } from './config';
import {
  FREE_ENTITLEMENT,
  hasProAccess,
  parseEntitlement,
  settleEntitlement,
  type Entitlement,
} from './entitlement';
import type { ProFeature } from './features';
import {
  createPurchaseAdapter,
  type ProOffering,
  type PurchaseAdapter,
  type PurchaseOutcome,
  type RestoreOutcome,
} from './purchaseAdapter';

type OfferingsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; offerings: ProOffering[] }
  | { status: 'error' };

type ProValue = {
  hydrated: boolean;
  /** False in builds without a store integration: no Pro surfaces are shown at all. */
  available: boolean;
  isPro: boolean;
  entitlement: Entitlement;
  offerings: OfferingsState;
  loadOfferings: () => Promise<void>;
  purchase: (plan: ProPlan) => Promise<PurchaseOutcome>;
  restore: () => Promise<RestoreOutcome>;
  refresh: () => Promise<void>;
  /** Ties store purchases to a Foxiem account (or back to an anonymous device with null). No-op without a store. */
  identify: (userId: string | null) => Promise<void>;
  manageUrl: string | null;
  canUse: (feature: ProFeature) => boolean;
  /** Development builds only. */
  simulator: SimulatedAdapter | null;
  clearCache: () => Promise<void>;
};

const ProContext = createContext<ProValue | null>(null);

async function persist(entitlement: Entitlement): Promise<void> {
  try {
    await writeJson(STORAGE_KEYS.entitlement, entitlement);
  } catch {
    // The store remains the source of truth; the cache is a convenience for offline use.
  }
}

export function ProProvider({ children, adapter: injected }: { children: ReactNode; adapter?: PurchaseAdapter }) {
  const adapter = useMemo(() => injected ?? createPurchaseAdapter(() => i18n.language), [injected]);
  const [hydrated, setHydrated] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement>(FREE_ENTITLEMENT);
  const [offerings, setOfferings] = useState<OfferingsState>({ status: 'idle' });
  const [now, setNow] = useState(() => new Date());
  const refreshing = useRef(false);

  const apply = useCallback(async (next: Entitlement) => {
    setEntitlement(next);
    setNow(new Date());
    await persist(next);
  }, []);

  const refresh = useCallback(async () => {
    if (adapter.kind === 'unavailable' || refreshing.current) {
      return;
    }
    refreshing.current = true;
    try {
      const latest = await adapter.refresh();
      if (latest) {
        await apply(settleEntitlement(latest));
      }
    } catch {
      // Offline: keep the cached entitlement until it expires (plus grace).
    } finally {
      refreshing.current = false;
    }
  }, [adapter, apply]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cached = settleEntitlement(parseEntitlement(await readJson<unknown>(STORAGE_KEYS.entitlement)));
        if (!cancelled) {
          // A cached entitlement from the development simulator is only ever honoured by the simulator itself.
          setEntitlement(cached.source === 'simulated' && adapter.kind !== 'simulated' ? FREE_ENTITLEMENT : cached);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [adapter, refresh]);

  // Renewals, refunds and restores made elsewhere arrive here without waiting for the next foreground.
  useEffect(() => {
    if (!adapter.subscribe) {
      return undefined;
    }
    return adapter.subscribe((latest) => {
      void apply(settleEntitlement(latest));
    });
  }, [adapter, apply]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date());
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  const loadOfferings = useCallback(async () => {
    if (adapter.kind === 'unavailable') {
      setOfferings({ status: 'ready', offerings: [] });
      return;
    }
    setOfferings({ status: 'loading' });
    try {
      setOfferings({ status: 'ready', offerings: await adapter.getOfferings() });
    } catch {
      setOfferings({ status: 'error' });
    }
  }, [adapter]);

  const purchase = useCallback(
    async (plan: ProPlan): Promise<PurchaseOutcome> => {
      void trackEvent('purchase_started', { plan });
      try {
        const outcome = await adapter.purchase(plan);
        if (outcome.status === 'success') {
          await apply(outcome.entitlement);
          void trackEvent('purchase_completed', { plan });
        }
        return outcome;
      } catch {
        return { status: 'failed', reason: 'unknown' };
      }
    },
    [adapter, apply],
  );

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    try {
      const outcome = await adapter.restore();
      if (outcome.status === 'restored') {
        await apply(settleEntitlement(outcome.entitlement));
      }
      return outcome;
    } catch {
      return { status: 'failed', reason: 'unknown' };
    }
  }, [adapter, apply]);

  const identify = useCallback(
    async (userId: string | null) => {
      if (!adapter.identify) {
        return;
      }
      const latest = await adapter.identify(userId);
      if (latest) {
        await apply(settleEntitlement(latest));
      }
    },
    [adapter, apply],
  );

  const clearCache = useCallback(async () => {
    setEntitlement(FREE_ENTITLEMENT);
    setOfferings({ status: 'idle' });
  }, []);

  const available = adapter.kind !== 'unavailable';
  const isPro = available && hasProAccess(entitlement, now);
  const canUse = useCallback((_feature: ProFeature) => isPro, [isPro]);

  const value = useMemo<ProValue>(
    () => ({
      hydrated,
      available,
      isPro,
      entitlement,
      offerings,
      loadOfferings,
      purchase,
      restore,
      refresh,
      identify,
      manageUrl: adapter.manageUrl(),
      canUse,
      simulator: adapter.kind === 'simulated' ? (adapter as SimulatedAdapter) : null,
      clearCache,
    }),
    [hydrated, available, isPro, entitlement, offerings, loadOfferings, purchase, restore, refresh, identify, adapter, canUse, clearCache],
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProValue {
  const context = useContext(ProContext);
  if (!context) {
    throw new Error('usePro must be used within ProProvider');
  }
  return context;
}
