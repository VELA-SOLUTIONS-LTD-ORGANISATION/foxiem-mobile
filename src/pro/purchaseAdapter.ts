import { Platform } from 'react-native';

import { getRevenueCatKey, storeEnabledInDevelopment } from './billingConfig';
import type { ProPlan } from './config';
import type { Entitlement } from './entitlement';
import { createRevenueCatAdapter, loadPurchasesSdk } from './revenueCatAdapter';

export type ProOffering = {
  plan: ProPlan;
  productId: string;
  billing: 'month' | 'year' | 'once';
  /** Localized, formatted price exactly as the store will charge it. */
  price: string;
  /** Yearly only: the same price expressed per month, shown next to the full price. */
  pricePerMonth: string | null;
};

export type PurchaseFailure = 'network' | 'store' | 'notAllowed' | 'unknown';

export type PurchaseOutcome =
  | { status: 'success'; entitlement: Entitlement }
  | { status: 'pending' }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: PurchaseFailure };

export type RestoreOutcome =
  | { status: 'restored'; entitlement: Entitlement }
  | { status: 'nothingToRestore' }
  | { status: 'failed'; reason: PurchaseFailure };

/**
 * The boundary between Foxiem and a store SDK. Production uses RevenueCat
 * (`revenueCatAdapter.ts`); development can use the simulator (`src/dev`).
 */
export interface PurchaseAdapter {
  readonly kind: 'store' | 'simulated' | 'unavailable';
  getOfferings(): Promise<ProOffering[]>;
  purchase(plan: ProPlan): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
  /** Latest entitlement from the store, or null when it cannot be reached. */
  refresh(): Promise<Entitlement | null>;
  manageUrl(): string | null;
  /**
   * Ties store purchases to a Foxiem account (`userId`) or back to an anonymous device (`null`).
   * Returns the entitlement of the identity now in effect, or null when the store cannot be reached.
   */
  identify?(userId: string | null): Promise<Entitlement | null>;
  /** Live entitlement changes pushed by the store (renewal, refund, restore elsewhere). Returns an unsubscribe. */
  subscribe?(listener: (entitlement: Entitlement) => void): () => void;
}

/** What a build without working store configuration uses: nothing is for sale, nothing pretends to be. */
export const unavailableAdapter: PurchaseAdapter = {
  kind: 'unavailable',
  getOfferings: async () => [],
  purchase: async () => ({ status: 'failed', reason: 'store' }),
  restore: async () => ({ status: 'nothingToRestore' }),
  refresh: async () => null,
  manageUrl: () => null,
};

/**
 * Which adapter this build uses.
 *
 * - Development: the simulator, unless `EXPO_PUBLIC_REVENUECAT_IN_DEV=1` and a key is present.
 * - Release with a valid RevenueCat key for this platform and the native SDK linked: the real store.
 * - Anything else: `unavailable`, so no Pro surface is shown and nothing pretends to sell.
 */
export function createPurchaseAdapter(getLocale: () => string): PurchaseAdapter {
  if (__DEV__ && !storeEnabledInDevelopment()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSimulatedAdapter } = require('@/dev/simulatedAdapter') as typeof import('@/dev/simulatedAdapter');
    return createSimulatedAdapter(getLocale);
  }
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return unavailableAdapter;
  }
  const key = getRevenueCatKey(Platform.OS);
  if (!key.valid) {
    return unavailableAdapter;
  }
  const sdk = loadPurchasesSdk();
  if (!sdk) {
    return unavailableAdapter;
  }
  return createRevenueCatAdapter({ sdk, apiKey: key.apiKey, platform: Platform.OS });
}
