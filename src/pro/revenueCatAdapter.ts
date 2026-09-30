import { MANAGE_SUBSCRIPTION_URLS, PRO_PLANS, type ProPlan } from './config';
import { entitlementFromCustomerInfo, planForProduct, type StoreCustomerInfo } from './customerInfoMapping';
import type { Entitlement } from './entitlement';
import type { ProOffering, PurchaseAdapter, PurchaseFailure, PurchaseOutcome, RestoreOutcome } from './purchaseAdapter';

/** The slice of a RevenueCat package this adapter reads. */
export type StorePackage = {
  identifier: string;
  product: {
    identifier: string;
    priceString: string;
    pricePerMonthString?: string | null;
  };
};

export type StoreOfferings = {
  current: { availablePackages: StorePackage[] } | null;
  all: Record<string, { availablePackages: StorePackage[] } | undefined>;
};

export type StoreError = {
  code?: number | string;
  readableErrorCode?: string;
  userCancelled?: boolean | null;
  message?: string;
};

type CustomerInfoListener = (info: StoreCustomerInfo) => void;

/** The subset of `react-native-purchases` the adapter needs; tests provide a fake. */
export interface PurchasesSdk {
  configure(configuration: { apiKey: string }): void;
  isConfigured(): Promise<boolean>;
  getOfferings(): Promise<StoreOfferings>;
  purchasePackage(pack: StorePackage): Promise<{ customerInfo: StoreCustomerInfo }>;
  restorePurchases(): Promise<StoreCustomerInfo>;
  getCustomerInfo(): Promise<StoreCustomerInfo>;
  logIn(appUserID: string): Promise<{ customerInfo: StoreCustomerInfo }>;
  logOut(): Promise<StoreCustomerInfo>;
  addCustomerInfoUpdateListener(listener: CustomerInfoListener): void;
  removeCustomerInfoUpdateListener(listener: CustomerInfoListener): boolean | void;
}

export type StorePlatform = 'ios' | 'android';

/** Maps RevenueCat's readable error names onto the outcomes the paywall knows how to explain. */
export function classifyStoreError(error: unknown): 'cancelled' | 'pending' | 'alreadyPurchased' | PurchaseFailure {
  const record = (typeof error === 'object' && error !== null ? error : {}) as StoreError;
  const name = record.readableErrorCode ?? '';
  if (record.userCancelled === true || name === 'PURCHASE_CANCELLED_ERROR') {
    return 'cancelled';
  }
  switch (name) {
    case 'PAYMENT_PENDING_ERROR':
      return 'pending';
    case 'PRODUCT_ALREADY_PURCHASED_ERROR':
      return 'alreadyPurchased';
    case 'NETWORK_ERROR':
    case 'OFFLINE_CONNECTION_ERROR':
      return 'network';
    case 'PURCHASE_NOT_ALLOWED_ERROR':
    case 'PURCHASE_INVALID_ERROR':
      return 'notAllowed';
    case 'STORE_PROBLEM_ERROR':
    case 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR':
    case 'CONFIGURATION_ERROR':
    case 'INVALID_CREDENTIALS_ERROR':
      return 'store';
    default:
      return 'unknown';
  }
}

function packagesFrom(offerings: StoreOfferings): StorePackage[] {
  const current = offerings.current?.availablePackages ?? [];
  if (current.some((pack) => planForProduct(pack.product.identifier))) {
    return current;
  }
  // No usable "current" offering: look through the others rather than showing nothing.
  return Object.values(offerings.all).flatMap((offering) => offering?.availablePackages ?? []);
}

export function offeringsFromPackages(packages: readonly StorePackage[]): { offerings: ProOffering[]; byPlan: Map<ProPlan, StorePackage> } {
  const byPlan = new Map<ProPlan, StorePackage>();
  for (const pack of packages) {
    const plan = planForProduct(pack.product.identifier);
    if (plan && !byPlan.has(plan)) {
      byPlan.set(plan, pack);
    }
  }
  const offerings: ProOffering[] = [];
  for (const config of PRO_PLANS) {
    const pack = byPlan.get(config.plan);
    if (!pack) {
      continue;
    }
    offerings.push({
      plan: config.plan,
      productId: config.productId,
      billing: config.billing,
      // Exactly the string the store will charge, in the store's currency and format.
      price: pack.product.priceString,
      pricePerMonth: config.billing === 'year' ? pack.product.pricePerMonthString ?? null : null,
    });
  }
  return { offerings, byPlan };
}

export type StoreAdapter = PurchaseAdapter & {
  /** Live updates from the store (renewals, refunds, restores on another device). Returns an unsubscribe. */
  subscribe(listener: (entitlement: Entitlement) => void): () => void;
};

/** RevenueCat-backed billing. Purchases, restores and entitlements come from the store, never from local flags. */
export function createRevenueCatAdapter(options: {
  sdk: PurchasesSdk;
  apiKey: string;
  platform: StorePlatform;
  now?: () => Date;
}): StoreAdapter {
  const { sdk, apiKey, platform } = options;
  const now = options.now ?? (() => new Date());
  let configured: Promise<void> | null = null;
  let packages = new Map<ProPlan, StorePackage>();

  const ensureConfigured = (): Promise<void> => {
    configured ??= (async () => {
      if (!(await sdk.isConfigured())) {
        sdk.configure({ apiKey });
      }
    })().catch((error: unknown) => {
      configured = null;
      throw error;
    });
    return configured;
  };

  const toEntitlement = (info: StoreCustomerInfo) => entitlementFromCustomerInfo(info, now());

  const loadPackages = async (): Promise<ProOffering[]> => {
    await ensureConfigured();
    const loaded = offeringsFromPackages(packagesFrom(await sdk.getOfferings()));
    packages = loaded.byPlan;
    return loaded.offerings;
  };

  return {
    kind: 'store',
    getOfferings: loadPackages,

    async purchase(plan): Promise<PurchaseOutcome> {
      try {
        await ensureConfigured();
        if (!packages.has(plan)) {
          await loadPackages();
        }
        const pack = packages.get(plan);
        if (!pack) {
          return { status: 'failed', reason: 'store' };
        }
        const { customerInfo } = await sdk.purchasePackage(pack);
        const entitlement = toEntitlement(customerInfo);
        // A completed purchase that the store has not attached to Pro yet is treated as pending, not as an error.
        return entitlement.status === 'active' || entitlement.status === 'lifetime' || entitlement.status === 'grace'
          ? { status: 'success', entitlement }
          : { status: 'pending' };
      } catch (error) {
        const kind = classifyStoreError(error);
        if (kind === 'cancelled') {
          return { status: 'cancelled' };
        }
        if (kind === 'pending') {
          return { status: 'pending' };
        }
        if (kind === 'alreadyPurchased') {
          try {
            const entitlement = toEntitlement(await sdk.getCustomerInfo());
            if (entitlement.status === 'active' || entitlement.status === 'lifetime' || entitlement.status === 'grace') {
              return { status: 'success', entitlement };
            }
          } catch {
            // Fall through to a generic failure.
          }
          return { status: 'failed', reason: 'store' };
        }
        return { status: 'failed', reason: kind };
      }
    },

    async restore(): Promise<RestoreOutcome> {
      try {
        await ensureConfigured();
        const entitlement = toEntitlement(await sdk.restorePurchases());
        return entitlement.status === 'active' || entitlement.status === 'lifetime' || entitlement.status === 'grace'
          ? { status: 'restored', entitlement }
          : { status: 'nothingToRestore' };
      } catch (error) {
        const kind = classifyStoreError(error);
        return { status: 'failed', reason: kind === 'cancelled' || kind === 'pending' || kind === 'alreadyPurchased' ? 'unknown' : kind };
      }
    },

    async refresh(): Promise<Entitlement | null> {
      try {
        await ensureConfigured();
        return toEntitlement(await sdk.getCustomerInfo());
      } catch {
        return null;
      }
    },

    async identify(userId): Promise<Entitlement | null> {
      try {
        await ensureConfigured();
        if (userId) {
          // Attaches this device's anonymous purchases to the Foxiem account (RevenueCat aliasing).
          return toEntitlement((await sdk.logIn(userId)).customerInfo);
        }
        try {
          return toEntitlement(await sdk.logOut());
        } catch {
          // Already anonymous: RevenueCat refuses to log out an anonymous user. Nothing to undo.
          return toEntitlement(await sdk.getCustomerInfo());
        }
      } catch {
        return null;
      }
    },

    subscribe(listener) {
      let active = true;
      const forward: CustomerInfoListener = (info) => {
        if (active) {
          listener(toEntitlement(info));
        }
      };
      void ensureConfigured().then(
        () => {
          if (active) {
            sdk.addCustomerInfoUpdateListener(forward);
          }
        },
        () => undefined,
      );
      return () => {
        active = false;
        try {
          sdk.removeCustomerInfoUpdateListener(forward);
        } catch {
          // The SDK was never ready; nothing to remove.
        }
      };
    },

    manageUrl() {
      return platform === 'ios' ? MANAGE_SUBSCRIPTION_URLS.ios : MANAGE_SUBSCRIPTION_URLS.android;
    },
  };
}

/** Loads the native SDK lazily so Expo Go, web and tests never touch it. Returns null when the module is absent. */
export function loadPurchasesSdk(): PurchasesSdk | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('react-native-purchases') as { default?: unknown } & Record<string, unknown>;
    const candidate = (module.default ?? module) as Partial<PurchasesSdk> | undefined;
    if (candidate && typeof candidate.configure === 'function' && typeof candidate.getOfferings === 'function') {
      return candidate as PurchasesSdk;
    }
  } catch {
    // Not linked in this runtime (Expo Go, web, unit tests).
  }
  return null;
}
