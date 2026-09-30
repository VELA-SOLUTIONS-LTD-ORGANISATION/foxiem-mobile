/**
 * What a RELEASE build (`__DEV__ === false`) does with billing: it can only ever sell through the real
 * RevenueCat SDK with a valid public key, never through the simulator, a Test Store key or a local flag.
 */
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { writeJson } from '@/storage/appStorage';
import { STORAGE_KEYS } from '@/storage/keys';

import { FREE_ENTITLEMENT, type Entitlement } from '../entitlement';
import { ProProvider, usePro } from '../ProProvider';
import type { PurchaseAdapter } from '../purchaseAdapter';

type Env = { ios?: string; android?: string; inDev?: string };

const flags = globalThis as unknown as { __DEV__: boolean };
const originalDev = flags.__DEV__;
const originalEnv = { ...process.env };

afterEach(() => {
  flags.__DEV__ = originalDev;
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

/** Loads a fresh copy of the purchase boundary the way a build with these environment variables would. */
function loadBoundary(options: { dev: boolean; platform: 'ios' | 'android'; env: Env; sdk: 'present' | 'missing' }) {
  flags.__DEV__ = options.dev;
  delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  delete process.env.EXPO_PUBLIC_REVENUECAT_IN_DEV;
  if (options.env.ios) process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = options.env.ios;
  if (options.env.android) process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY = options.env.android;
  if (options.env.inDev) process.env.EXPO_PUBLIC_REVENUECAT_IN_DEV = options.env.inDev;

  let boundary!: typeof import('../purchaseAdapter');
  jest.isolateModules(() => {
    const rn = require('react-native') as { Platform: { OS: string } };
    jest.replaceProperty(rn.Platform, 'OS', options.platform);
    const configure = jest.fn();
    jest.doMock('../revenueCatAdapter', () => ({
      ...jest.requireActual('../revenueCatAdapter'),
      loadPurchasesSdk: () =>
        options.sdk === 'present'
          ? {
              configure,
              getOfferings: async () => ({ current: null, all: {} }),
              getCustomerInfo: async () => ({ entitlements: { active: {}, all: {} } }),
              purchasePackage: jest.fn(),
              restorePurchases: jest.fn(),
              logIn: jest.fn(),
              logOut: jest.fn(),
              addCustomerInfoUpdateListener: jest.fn(),
              removeCustomerInfoUpdateListener: jest.fn(),
              isConfigured: async () => false,
            }
          : null,
    }));
    boundary = require('../purchaseAdapter');
  });
  return boundary;
}

const locale = () => 'en';

describe('release purchase adapter', () => {
  it('sells nothing without a key, and never falls back to the simulator', () => {
    for (const platform of ['ios', 'android'] as const) {
      const { createPurchaseAdapter } = loadBoundary({ dev: false, platform, env: {}, sdk: 'present' });
      expect(createPurchaseAdapter(locale).kind).toBe('unavailable');
    }
  });

  it('ignores the development sandbox switch in a release build', () => {
    const { createPurchaseAdapter } = loadBoundary({ dev: false, platform: 'ios', env: { inDev: '1' }, sdk: 'present' });
    expect(createPurchaseAdapter(locale).kind).toBe('unavailable');
  });

  it.each([
    ['a Test Store key', 'test_abcdef'],
    ['an Android key on iOS', 'goog_abcdef'],
    ['a malformed key', 'abcdef'],
    ['a blank key', '   '],
  ])('refuses %s', (_name, key) => {
    const { createPurchaseAdapter } = loadBoundary({ dev: false, platform: 'ios', env: { ios: key }, sdk: 'present' });
    expect(createPurchaseAdapter(locale).kind).toBe('unavailable');
  });

  it('refuses an iOS key on Android and a Test Store key on Android', () => {
    for (const key of ['appl_abcdef', 'test_abcdef']) {
      const { createPurchaseAdapter } = loadBoundary({ dev: false, platform: 'android', env: { android: key }, sdk: 'present' });
      expect(createPurchaseAdapter(locale).kind).toBe('unavailable');
    }
  });

  it('is unavailable when the native SDK is not linked, even with a valid key', () => {
    const { createPurchaseAdapter } = loadBoundary({ dev: false, platform: 'ios', env: { ios: 'appl_abcdef' }, sdk: 'missing' });
    expect(createPurchaseAdapter(locale).kind).toBe('unavailable');
  });

  it('uses the real store only with a valid platform key and a linked SDK', () => {
    const ios = loadBoundary({ dev: false, platform: 'ios', env: { ios: 'appl_abcdef' }, sdk: 'present' });
    expect(ios.createPurchaseAdapter(locale).kind).toBe('store');
    const android = loadBoundary({ dev: false, platform: 'android', env: { android: 'goog_abcdef' }, sdk: 'present' });
    expect(android.createPurchaseAdapter(locale).kind).toBe('store');
  });

  it('the unavailable adapter offers nothing, sells nothing and restores nothing', async () => {
    const { unavailableAdapter } = loadBoundary({ dev: false, platform: 'ios', env: {}, sdk: 'missing' });
    expect(await unavailableAdapter.getOfferings()).toEqual([]);
    expect(await unavailableAdapter.purchase('yearly')).toEqual({ status: 'failed', reason: 'store' });
    expect(await unavailableAdapter.restore()).toEqual({ status: 'nothingToRestore' });
    expect(await unavailableAdapter.refresh()).toBeNull();
  });

  it('the simulator is only chosen by a development build that did not ask for the real store', () => {
    const dev = loadBoundary({ dev: true, platform: 'ios', env: {}, sdk: 'missing' });
    expect(dev.createPurchaseAdapter(locale).kind).toBe('simulated');
    const devStore = loadBoundary({ dev: true, platform: 'ios', env: { inDev: '1', ios: 'test_abcdef' }, sdk: 'present' });
    expect(devStore.createPurchaseAdapter(locale).kind).toBe('store');
  });
});

describe('ProProvider with cached entitlements', () => {
  const cachedStore: Entitlement = {
    status: 'active',
    plan: 'yearly',
    expiresAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    willRenew: true,
    verifiedAt: new Date().toISOString(),
    source: 'store',
  };

  function adapterOf(kind: PurchaseAdapter['kind'], refresh: PurchaseAdapter['refresh']): PurchaseAdapter {
    return {
      kind,
      getOfferings: async () => [],
      purchase: async () => ({ status: 'failed', reason: 'store' }),
      restore: async () => ({ status: 'nothingToRestore' }),
      refresh,
      manageUrl: () => null,
    };
  }

  async function proStateWith(cached: Entitlement | null, adapter: PurchaseAdapter) {
    await writeJson(STORAGE_KEYS.entitlement, cached ?? FREE_ENTITLEMENT);
    function Probe() {
      const pro = usePro();
      return <Text testID="state">{`${pro.hydrated}:${pro.isPro}:${pro.available}`}</Text>;
    }
    const view = await render(
      <ProProvider adapter={adapter}>
        <Probe />
      </ProProvider>,
    );
    await waitFor(() => expect(view.getByTestId('state').props.children).toMatch(/^true:/));
    // Let the first store refresh settle.
    await new Promise((resolve) => setTimeout(resolve, 20));
    const state = view.getByTestId('state').props.children as string;
    await view.unmount();
    return state;
  }

  it('keeps Pro from the cached store entitlement when the store cannot be reached', async () => {
    const offline = adapterOf('store', async () => {
      throw new Error('offline');
    });
    expect(await proStateWith(cachedStore, offline)).toBe('true:true:true');
    expect(await proStateWith(cachedStore, adapterOf('store', async () => null))).toBe('true:true:true');
  });

  it('drops Pro when the store reports the subscription expired', async () => {
    const expired: Entitlement = { ...cachedStore, status: 'expired', willRenew: false };
    expect(await proStateWith(cachedStore, adapterOf('store', async () => expired))).toBe('true:false:true');
  });

  it('keeps lifetime Pro offline', async () => {
    const lifetime: Entitlement = { status: 'lifetime', plan: 'lifetime', expiresAt: null, willRenew: false, verifiedAt: new Date().toISOString(), source: 'store' };
    expect(await proStateWith(lifetime, adapterOf('store', async () => null))).toBe('true:true:true');
  });

  it('does not honour a cached simulator entitlement in a store build', async () => {
    const simulated: Entitlement = { ...cachedStore, source: 'simulated' };
    expect(await proStateWith(simulated, adapterOf('store', async () => null))).toBe('true:false:true');
  });

  it('shows no Pro at all when billing is unavailable, whatever is cached', async () => {
    expect(await proStateWith(cachedStore, adapterOf('unavailable', async () => null))).toBe('true:false:false');
    expect(await proStateWith(FREE_ENTITLEMENT, adapterOf('unavailable', async () => null))).toBe('true:false:false');
  });
});