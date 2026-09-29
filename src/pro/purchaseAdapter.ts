import { Platform } from 'react-native';

import { readJson, writeJson } from '@/storage/appStorage';
import { STORAGE_KEYS } from '@/storage/keys';

import { MANAGE_SUBSCRIPTION_URLS, PRO_PLANS, PRO_REFERENCE_CURRENCY, type ProPlan } from './config';
import { FREE_ENTITLEMENT, type Entitlement } from './entitlement';

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
 * The boundary between Foxiem and a store SDK (RevenueCat, StoreKit 2 / Play Billing).
 * A real implementation lives in one file and is returned from `createPurchaseAdapter`.
 */
export interface PurchaseAdapter {
  readonly kind: 'store' | 'simulated' | 'unavailable';
  getOfferings(): Promise<ProOffering[]>;
  purchase(plan: ProPlan): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
  /** Latest entitlement from the store, or null when it cannot be reached. */
  refresh(): Promise<Entitlement | null>;
  manageUrl(): string | null;
}

/** Production default until a store integration ships: nothing is for sale, nothing pretends to be. */
export const unavailableAdapter: PurchaseAdapter = {
  kind: 'unavailable',
  getOfferings: async () => [],
  purchase: async () => ({ status: 'failed', reason: 'store' }),
  restore: async () => ({ status: 'nothingToRestore' }),
  refresh: async () => null,
  manageUrl: () => null,
};

export type SimulatedScenario = 'success' | 'cancelled' | 'failed' | 'pending';

type SimulatedStore = {
  plan: ProPlan | null;
  expiresAt: string | null;
  scenario: SimulatedScenario;
};

async function readStore(): Promise<SimulatedStore> {
  const value = await readJson<Partial<SimulatedStore>>(STORAGE_KEYS.devStore);
  return {
    plan: value?.plan ?? null,
    expiresAt: value?.expiresAt ?? null,
    scenario: value?.scenario ?? 'success',
  };
}

async function writeStore(store: SimulatedStore): Promise<void> {
  await writeJson(STORAGE_KEYS.devStore, store);
}

function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: PRO_REFERENCE_CURRENCY }).format(amount);
}

function entitlementFor(plan: ProPlan, expiresAt: string | null, now: Date): Entitlement {
  return {
    status: plan === 'lifetime' ? 'lifetime' : expiresAt && Date.parse(expiresAt) < now.getTime() ? 'expired' : 'active',
    plan,
    expiresAt: plan === 'lifetime' ? null : expiresAt,
    willRenew: plan !== 'lifetime',
    verifiedAt: now.toISOString(),
    source: 'simulated',
  };
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Development-only store that exercises every outcome without charging anyone. */
export function createSimulatedAdapter(getLocale: () => string): PurchaseAdapter & {
  setScenario(scenario: SimulatedScenario): Promise<void>;
  expireNow(): Promise<void>;
  clear(): Promise<void>;
  getScenario(): Promise<SimulatedScenario>;
} {
  return {
    kind: 'simulated',
    async getOfferings() {
      await delay(250);
      const locale = getLocale();
      return PRO_PLANS.map((plan) => ({
        plan: plan.plan,
        productId: plan.productId,
        billing: plan.billing,
        price: formatPrice(plan.referencePrice, locale),
        pricePerMonth: plan.billing === 'year' ? formatPrice(plan.referencePrice / 12, locale) : null,
      }));
    },
    async purchase(plan) {
      await delay(700);
      const store = await readStore();
      if (store.scenario === 'cancelled') {
        return { status: 'cancelled' };
      }
      if (store.scenario === 'failed') {
        return { status: 'failed', reason: 'network' };
      }
      if (store.scenario === 'pending') {
        return { status: 'pending' };
      }
      const now = new Date();
      const expiresAt =
        plan === 'lifetime'
          ? null
          : new Date(now.getFullYear() + (plan === 'yearly' ? 1 : 0), now.getMonth() + (plan === 'monthly' ? 1 : 0), now.getDate()).toISOString();
      await writeStore({ ...store, plan, expiresAt });
      return { status: 'success', entitlement: entitlementFor(plan, expiresAt, now) };
    },
    async restore() {
      await delay(600);
      const store = await readStore();
      if (!store.plan) {
        return { status: 'nothingToRestore' };
      }
      return { status: 'restored', entitlement: entitlementFor(store.plan, store.expiresAt, new Date()) };
    },
    async refresh() {
      const store = await readStore();
      return store.plan ? entitlementFor(store.plan, store.expiresAt, new Date()) : FREE_ENTITLEMENT;
    },
    manageUrl() {
      return Platform.OS === 'ios' ? MANAGE_SUBSCRIPTION_URLS.ios : MANAGE_SUBSCRIPTION_URLS.android;
    },
    async setScenario(scenario) {
      await writeStore({ ...(await readStore()), scenario });
    },
    async getScenario() {
      return (await readStore()).scenario;
    },
    async expireNow() {
      const store = await readStore();
      await writeStore({ ...store, expiresAt: new Date(Date.now() - 86_400_000 * 10).toISOString() });
    },
    async clear() {
      await writeStore({ plan: null, expiresAt: null, scenario: 'success' });
    },
  };
}

export type SimulatedAdapter = ReturnType<typeof createSimulatedAdapter>;

/**
 * Swap in the real store adapter here once products exist in App Store Connect and Play Console.
 * Development builds use the simulator; production shows no Pro surfaces until then.
 */
export function createPurchaseAdapter(getLocale: () => string): PurchaseAdapter {
  if (__DEV__) {
    return createSimulatedAdapter(getLocale);
  }
  return unavailableAdapter;
}
