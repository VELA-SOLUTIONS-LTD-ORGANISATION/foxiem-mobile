import { checkRevenueCatKey } from '@/pro/billingConfig';
import {
  entitlementFromCustomerInfo,
  planForProduct,
  type StoreCustomerInfo,
  type StoreEntitlementInfo,
} from '@/pro/customerInfoMapping';
import { hasProAccess } from '@/pro/entitlement';
import {
  classifyStoreError,
  createRevenueCatAdapter,
  offeringsFromPackages,
  type PurchasesSdk,
  type StoreOfferings,
  type StorePackage,
} from '@/pro/revenueCatAdapter';

const NOW = new Date('2026-09-29T12:00:00Z');
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

function info(entitlement: Partial<StoreEntitlementInfo> | null = {}, active = true): StoreCustomerInfo {
  if (!entitlement) {
    return { entitlements: { active: {}, all: {} } };
  }
  const full: StoreEntitlementInfo = {
    isActive: active,
    willRenew: true,
    productIdentifier: 'foxiem_pro_yearly',
    expirationDate: iso(200),
    billingIssueDetectedAt: null,
    ...entitlement,
  };
  return { entitlements: { active: active ? { pro: full } : {}, all: { pro: full } } };
}

const pack = (identifier: string, priceString: string, pricePerMonthString: string | null = null): StorePackage => ({
  identifier,
  product: { identifier, priceString, pricePerMonthString },
});

describe('customer info → entitlement', () => {
  it('maps product ids including Google Play base plan suffixes', () => {
    expect(planForProduct('foxiem_pro_monthly')).toBe('monthly');
    expect(planForProduct('foxiem_pro_yearly:p1y')).toBe('yearly');
    expect(planForProduct('foxiem_pro_lifetime')).toBe('lifetime');
    expect(planForProduct('foxiem_pro_weekly')).toBeNull();
  });

  it('is free without a pro entitlement', () => {
    const result = entitlementFromCustomerInfo(info(null), NOW);
    expect(result.status).toBe('free');
    expect(hasProAccess(result, NOW)).toBe(false);
  });

  it('maps an active yearly subscription that will renew', () => {
    const result = entitlementFromCustomerInfo(info(), NOW);
    expect(result).toMatchObject({ status: 'active', plan: 'yearly', willRenew: true, source: 'store' });
    expect(hasProAccess(result, NOW)).toBe(true);
  });

  it('keeps an active subscription that is set to cancel and shows it ends', () => {
    const result = entitlementFromCustomerInfo(info({ willRenew: false, productIdentifier: 'foxiem_pro_monthly', expirationDate: iso(10) }), NOW);
    expect(result).toMatchObject({ status: 'active', plan: 'monthly', willRenew: false });
    expect(hasProAccess(result, NOW)).toBe(true);
  });

  it('maps lifetime, with or without an expiry date', () => {
    const lifetime = entitlementFromCustomerInfo(info({ productIdentifier: 'foxiem_pro_lifetime', expirationDate: null, willRenew: false }), NOW);
    expect(lifetime).toMatchObject({ status: 'lifetime', plan: 'lifetime', expiresAt: null });
    const granted = entitlementFromCustomerInfo(info({ productIdentifier: 'promo_grant', expirationDate: null }), NOW);
    expect(granted.status).toBe('lifetime');
    expect(hasProAccess(granted, new Date(NOW.getTime() + 3650 * DAY))).toBe(true);
  });

  it('keeps access during the store grace period and flags the payment issue', () => {
    const result = entitlementFromCustomerInfo(info({ billingIssueDetectedAt: iso(-2), expirationDate: iso(-1) }), NOW);
    expect(result.status).toBe('grace');
    expect(result.willRenew).toBe(false);
  });

  it('has no access in billing retry once the store has ended grace', () => {
    const result = entitlementFromCustomerInfo(info({ billingIssueDetectedAt: iso(-20), expirationDate: iso(-15) }, false), NOW);
    expect(result.status).toBe('billingRetry');
    expect(hasProAccess(result, NOW)).toBe(false);
  });

  it('treats a very old billing flag as plain expiry', () => {
    const result = entitlementFromCustomerInfo(info({ billingIssueDetectedAt: iso(-400), expirationDate: iso(-390) }, false), NOW);
    expect(result.status).toBe('expired');
  });

  it('keeps the plan and date of an expired subscription for the welcome-back copy', () => {
    const result = entitlementFromCustomerInfo(info({ expirationDate: iso(-30), willRenew: false }, false), NOW);
    expect(result).toMatchObject({ status: 'expired', plan: 'yearly', willRenew: false });
    expect(result.expiresAt).toBe(iso(-30));
    expect(hasProAccess(result, NOW)).toBe(false);
  });
});

describe('offerings', () => {
  it('shows store-supplied prices, orders yearly first and never invents a weekly plan', () => {
    const { offerings } = offeringsFromPackages([
      pack('foxiem_pro_lifetime', '£44.99'),
      pack('foxiem_pro_monthly', '£2.99'),
      pack('foxiem_pro_yearly', '£19.99', '£1.67'),
      pack('foxiem_pro_weekly', '£0.99'),
    ]);
    expect(offerings.map((offering) => offering.plan)).toEqual(['yearly', 'monthly', 'lifetime']);
    expect(offerings[0]).toMatchObject({ price: '£19.99', pricePerMonth: '£1.67', billing: 'year' });
    expect(offerings[1]?.pricePerMonth).toBeNull();
    expect(offerings[2]).toMatchObject({ price: '£44.99', billing: 'once' });
  });

  it('returns only the plans the store actually has', () => {
    expect(offeringsFromPackages([pack('foxiem_pro_monthly', '€3,49')]).offerings).toHaveLength(1);
    expect(offeringsFromPackages([]).offerings).toEqual([]);
  });
});

describe('store errors', () => {
  it('classifies the outcomes the paywall explains', () => {
    expect(classifyStoreError({ userCancelled: true })).toBe('cancelled');
    expect(classifyStoreError({ readableErrorCode: 'PURCHASE_CANCELLED_ERROR' })).toBe('cancelled');
    expect(classifyStoreError({ readableErrorCode: 'PAYMENT_PENDING_ERROR' })).toBe('pending');
    expect(classifyStoreError({ readableErrorCode: 'NETWORK_ERROR' })).toBe('network');
    expect(classifyStoreError({ readableErrorCode: 'PURCHASE_NOT_ALLOWED_ERROR' })).toBe('notAllowed');
    expect(classifyStoreError({ readableErrorCode: 'STORE_PROBLEM_ERROR' })).toBe('store');
    expect(classifyStoreError({ readableErrorCode: 'PRODUCT_ALREADY_PURCHASED_ERROR' })).toBe('alreadyPurchased');
    expect(classifyStoreError(new Error('boom'))).toBe('unknown');
    expect(classifyStoreError(null)).toBe('unknown');
  });
});

describe('RevenueCat adapter', () => {
  function makeSdk(overrides: Partial<PurchasesSdk> = {}) {
    const listeners = new Set<(customerInfo: StoreCustomerInfo) => void>();
    const offerings: StoreOfferings = {
      current: { availablePackages: [pack('foxiem_pro_yearly', '£19.99', '£1.67'), pack('foxiem_pro_monthly', '£2.99')] },
      all: {},
    };
    const sdk = {
      listeners,
      configure: jest.fn(),
      isConfigured: jest.fn(async () => false),
      getOfferings: jest.fn(async () => offerings),
      purchasePackage: jest.fn(async () => ({ customerInfo: info() })),
      restorePurchases: jest.fn(async () => info()),
      getCustomerInfo: jest.fn(async () => info(null)),
      logIn: jest.fn(async () => ({ customerInfo: info() })),
      logOut: jest.fn(async () => info(null)),
      addCustomerInfoUpdateListener: jest.fn((listener) => void listeners.add(listener)),
      removeCustomerInfoUpdateListener: jest.fn((listener) => listeners.delete(listener)),
      ...overrides,
    } as PurchasesSdk & { listeners: typeof listeners; configure: jest.Mock };
    return sdk;
  }
  const make = (sdk: PurchasesSdk) => createRevenueCatAdapter({ sdk, apiKey: 'appl_test', platform: 'ios', now: () => NOW });

  it('configures once and loads store prices', async () => {
    const sdk = makeSdk();
    const adapter = make(sdk);
    const offerings = await adapter.getOfferings();
    await adapter.getOfferings();
    expect(sdk.configure).toHaveBeenCalledTimes(1);
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'appl_test' });
    expect(offerings.map((offering) => offering.price)).toEqual(['£19.99', '£2.99']);
  });

  it('does not reconfigure an SDK that is already configured', async () => {
    const sdk = makeSdk({ isConfigured: jest.fn(async () => true) });
    await make(sdk).getOfferings();
    expect(sdk.configure).not.toHaveBeenCalled();
  });

  it('completes a purchase and returns the store entitlement', async () => {
    const sdk = makeSdk();
    const outcome = await make(sdk).purchase('yearly');
    expect(outcome.status).toBe('success');
    expect(sdk.purchasePackage).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'foxiem_pro_yearly' }));
  });

  it('fails cleanly when the plan is not in the store', async () => {
    const outcome = await make(makeSdk()).purchase('lifetime');
    expect(outcome).toEqual({ status: 'failed', reason: 'store' });
  });

  it('reports cancelled, pending and failed purchases distinctly', async () => {
    const run = async (error: unknown) => {
      const sdk = makeSdk({ purchasePackage: jest.fn(async () => Promise.reject(error)) });
      return make(sdk).purchase('yearly');
    };
    await expect(run({ userCancelled: true, readableErrorCode: 'PURCHASE_CANCELLED_ERROR' })).resolves.toEqual({ status: 'cancelled' });
    await expect(run({ readableErrorCode: 'PAYMENT_PENDING_ERROR' })).resolves.toEqual({ status: 'pending' });
    await expect(run({ readableErrorCode: 'NETWORK_ERROR' })).resolves.toEqual({ status: 'failed', reason: 'network' });
    await expect(run(new Error('x'))).resolves.toEqual({ status: 'failed', reason: 'unknown' });
  });

  it('treats a purchase the store has not attached to Pro yet as pending', async () => {
    const sdk = makeSdk({ purchasePackage: jest.fn(async () => ({ customerInfo: info(null) })) });
    await expect(make(sdk).purchase('yearly')).resolves.toEqual({ status: 'pending' });
  });

  it('recovers an already-purchased product by reading customer info', async () => {
    const sdk = makeSdk({
      purchasePackage: jest.fn(async () => Promise.reject({ readableErrorCode: 'PRODUCT_ALREADY_PURCHASED_ERROR' })),
      getCustomerInfo: jest.fn(async () => info()),
    });
    await expect(make(sdk).purchase('yearly')).resolves.toMatchObject({ status: 'success' });
  });

  it('restores, reports nothing to restore and failures', async () => {
    await expect(make(makeSdk()).restore()).resolves.toMatchObject({ status: 'restored' });
    await expect(make(makeSdk({ restorePurchases: jest.fn(async () => info(null)) })).restore()).resolves.toEqual({ status: 'nothingToRestore' });
    const failing = makeSdk({ restorePurchases: jest.fn(async () => Promise.reject({ readableErrorCode: 'NETWORK_ERROR' })) });
    await expect(make(failing).restore()).resolves.toEqual({ status: 'failed', reason: 'network' });
  });

  it('does not treat an expired plan as restored', async () => {
    const sdk = makeSdk({ restorePurchases: jest.fn(async () => info({ expirationDate: iso(-5) }, false)) });
    await expect(make(sdk).restore()).resolves.toEqual({ status: 'nothingToRestore' });
  });

  it('refreshes from customer info and returns null when the store is unreachable', async () => {
    await expect(make(makeSdk({ getCustomerInfo: jest.fn(async () => info()) })).refresh()).resolves.toMatchObject({ status: 'active' });
    await expect(make(makeSdk({ getCustomerInfo: jest.fn(async () => Promise.reject(new Error('offline'))) })).refresh()).resolves.toBeNull();
  });

  it('ties purchases to the Foxiem account on sign-in and back to an anonymous device on sign-out', async () => {
    const sdk = makeSdk();
    const adapter = make(sdk);
    await expect(adapter.identify?.('user-1')).resolves.toMatchObject({ status: 'active' });
    expect(sdk.logIn).toHaveBeenCalledWith('user-1');
    await expect(adapter.identify?.(null)).resolves.toMatchObject({ status: 'free' });
    expect(sdk.logOut).toHaveBeenCalledTimes(1);
  });

  it('treats logging out an already-anonymous device as nothing to undo', async () => {
    const sdk = makeSdk({ logOut: jest.fn(async () => Promise.reject(new Error('anonymous'))) });
    await expect(make(sdk).identify?.(null)).resolves.toMatchObject({ status: 'free' });
  });

  it('returns null from identify when the store cannot be reached', async () => {
    const sdk = makeSdk({ logIn: jest.fn(async () => Promise.reject(new Error('offline'))) });
    await expect(make(sdk).identify?.('user-1')).resolves.toBeNull();
  });

  it('pushes live entitlement changes and stops after unsubscribe', async () => {
    const sdk = makeSdk();
    const adapter = make(sdk);
    const seen: string[] = [];
    const stop = adapter.subscribe((entitlement) => seen.push(entitlement.status));
    await new Promise((resolve) => setImmediate(resolve));
    for (const listener of sdk.listeners) {
      listener(info());
    }
    expect(seen).toEqual(['active']);
    stop();
    expect(sdk.removeCustomerInfoUpdateListener).toHaveBeenCalled();
    for (const listener of sdk.listeners) {
      listener(info());
    }
    expect(seen).toEqual(['active']);
  });

  it('exposes the platform subscription management page', () => {
    expect(make(makeSdk()).manageUrl()).toContain('apps.apple.com');
    expect(createRevenueCatAdapter({ sdk: makeSdk(), apiKey: 'goog_x', platform: 'android' }).manageUrl()).toContain('play.google.com');
  });
});

describe('billing key check', () => {
  it('requires a key for the right platform', () => {
    expect(checkRevenueCatKey('ios', undefined)).toEqual({ valid: false, reason: 'missing' });
    expect(checkRevenueCatKey('ios', '  ')).toEqual({ valid: false, reason: 'missing' });
    expect(checkRevenueCatKey('ios', 'goog_abc')).toEqual({ valid: false, reason: 'wrongPlatform' });
    expect(checkRevenueCatKey('android', 'appl_abc')).toEqual({ valid: false, reason: 'wrongPlatform' });
    expect(checkRevenueCatKey('ios', 'appl_abc')).toEqual({ valid: true, apiKey: 'appl_abc' });
    expect(checkRevenueCatKey('android', 'goog_abc')).toEqual({ valid: true, apiKey: 'goog_abc' });
  });

  it('never accepts a Test Store key in a release build', () => {
    expect(checkRevenueCatKey('ios', 'test_abc')).toEqual({ valid: false, reason: 'testKey' });
    expect(checkRevenueCatKey('ios', 'test_abc', true)).toEqual({ valid: true, apiKey: 'test_abc' });
  });
});
