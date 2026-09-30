import { Platform } from 'react-native';

import { MANAGE_SUBSCRIPTION_URLS, PRO_PLANS, PRO_REFERENCE_CURRENCY, type ProPlan } from '@/pro/config';
import { FREE_ENTITLEMENT, type Entitlement } from '@/pro/entitlement';
import type { PurchaseAdapter } from '@/pro/purchaseAdapter';
import { readJson, writeJson } from '@/storage/appStorage';
import { STORAGE_KEYS } from '@/storage/keys';

/**
 * Development-only store that exercises every purchase outcome without charging anyone.
 * It is required only behind `__DEV__` in `createPurchaseAdapter`, so release bundles never include it.
 */

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
