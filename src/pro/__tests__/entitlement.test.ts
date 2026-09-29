import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/i18n/locales/en.json';
import {
  FREE_ENTITLEMENT,
  OFFLINE_GRACE_MS,
  hasProAccess,
  parseEntitlement,
  settleEntitlement,
  type Entitlement,
} from '@/pro/entitlement';
import { PRO_FEATURES } from '@/pro/features';
import { createSimulatedAdapter, unavailableAdapter } from '@/pro/purchaseAdapter';

const now = new Date('2026-09-01T12:00:00Z');

function subscription(overrides: Partial<Entitlement>): Entitlement {
  return {
    status: 'active',
    plan: 'yearly',
    expiresAt: '2026-09-10T12:00:00Z',
    willRenew: true,
    verifiedAt: '2026-08-01T12:00:00Z',
    source: 'store',
    ...overrides,
  };
}

describe('Pro access', () => {
  it('is granted for active, grace and lifetime, and never for free, expired or billing retry', () => {
    expect(hasProAccess(subscription({ status: 'active' }), now)).toBe(true);
    expect(hasProAccess(subscription({ status: 'grace' }), now)).toBe(true);
    expect(hasProAccess(subscription({ status: 'lifetime', plan: 'lifetime', expiresAt: null }), now)).toBe(true);
    expect(hasProAccess(FREE_ENTITLEMENT, now)).toBe(false);
    expect(hasProAccess(subscription({ status: 'expired' }), now)).toBe(false);
    expect(hasProAccess(subscription({ status: 'billingRetry' }), now)).toBe(false);
  });

  it('trusts a cached subscription offline for a short grace window after expiry', () => {
    const cached = subscription({ expiresAt: now.toISOString() });
    expect(hasProAccess(cached, new Date(now.getTime() + OFFLINE_GRACE_MS))).toBe(true);
    expect(hasProAccess(cached, new Date(now.getTime() + OFFLINE_GRACE_MS + 1))).toBe(false);
  });

  it('settles a lapsed cached subscription to expired without inventing a new plan', () => {
    const lapsed = settleEntitlement(subscription({ expiresAt: '2026-01-01T00:00:00Z' }), now);
    expect(lapsed).toMatchObject({ status: 'expired', plan: 'yearly', willRenew: false });
    const lifetime = subscription({ status: 'lifetime', plan: 'lifetime', expiresAt: null });
    expect(settleEntitlement(lifetime, now)).toBe(lifetime);
  });

  it('treats unreadable cached state as Free and drops unknown fields', () => {
    expect(parseEntitlement(null)).toEqual(FREE_ENTITLEMENT);
    expect(parseEntitlement({ status: 'vip' })).toEqual(FREE_ENTITLEMENT);
    expect(parseEntitlement({ status: 'active', plan: 'weekly', expiresAt: 'soon', source: 'hacked', secret: 'x' })).toEqual({
      status: 'active',
      plan: null,
      expiresAt: null,
      willRenew: false,
      verifiedAt: null,
      source: 'none',
    });
  });

  it('describes every Pro feature in the paywall copy', () => {
    const features = en.pro.features as Record<string, { title: string; body: string }>;
    for (const key of Object.keys(PRO_FEATURES)) {
      expect(features[key]?.title).toBeTruthy();
      expect(features[key]?.body).toBeTruthy();
    }
  });
});

describe('purchase boundary', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function settle<T>(promise: Promise<T>): Promise<T> {
    await jest.runAllTimersAsync();
    return promise;
  }

  it('sells nothing and claims nothing when no store integration exists', async () => {
    expect(unavailableAdapter.kind).toBe('unavailable');
    await expect(unavailableAdapter.getOfferings()).resolves.toEqual([]);
    await expect(unavailableAdapter.restore()).resolves.toEqual({ status: 'nothingToRestore' });
    await expect(unavailableAdapter.refresh()).resolves.toBeNull();
    expect(unavailableAdapter.manageUrl()).toBeNull();
  });

  it('runs the full lifecycle in development: purchase, restore, expiry, cancel and pending', async () => {
    const adapter = createSimulatedAdapter(() => 'en-GB');

    const offerings = await settle(adapter.getOfferings());
    expect(offerings.map((offering) => offering.plan)).toEqual(['yearly', 'monthly', 'lifetime']);
    expect(offerings.find((offering) => offering.plan === 'yearly')?.pricePerMonth).toBeTruthy();

    await expect(settle(adapter.restore())).resolves.toEqual({ status: 'nothingToRestore' });

    const bought = await settle(adapter.purchase('yearly'));
    expect(bought).toMatchObject({ status: 'success', entitlement: { status: 'active', plan: 'yearly' } });

    const restored = await settle(adapter.restore());
    expect(restored).toMatchObject({ status: 'restored', entitlement: { plan: 'yearly' } });

    await adapter.expireNow();
    const refreshed = await adapter.refresh();
    expect(refreshed?.status).toBe('expired');
    expect(hasProAccess(refreshed!)).toBe(false);

    await adapter.setScenario('cancelled');
    await expect(settle(adapter.purchase('monthly'))).resolves.toEqual({ status: 'cancelled' });
    await adapter.setScenario('pending');
    await expect(settle(adapter.purchase('monthly'))).resolves.toEqual({ status: 'pending' });
  });
});
