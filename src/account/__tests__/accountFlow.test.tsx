import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ProProvider } from '@/pro/ProProvider';
import { FREE_ENTITLEMENT, type Entitlement } from '@/pro/entitlement';
import type { PurchaseAdapter } from '@/pro/purchaseAdapter';

import { AccountProvider, useAccount, type AccountValue } from '../AccountProvider';
import { AccountSync } from '../AccountSync';
import { ApiError, NetworkError, type ApiClient } from '../apiClient';
import type { AppleAuth, AppleIdTokenResult } from '../appleAuth';
import type { GoogleAuth, GoogleIdTokenResult } from '../googleAuth';
import type { Session } from '../session';

const SESSION: Session = {
  accessToken: 'a',
  refreshToken: 'r',
  accessExpiresAt: Date.now() + 900_000,
  user: { id: 'user-1', email: 'person@example.com', provider: 'google' },
};

const APPLE_SESSION: Session = {
  ...SESSION,
  user: { id: 'user-apple', email: 'apple@example.com', provider: 'apple' },
};

const ACTIVE: Entitlement = {
  status: 'active',
  plan: 'yearly',
  expiresAt: new Date(Date.now() + 200 * 86_400_000).toISOString(),
  willRenew: true,
  verifiedAt: new Date().toISOString(),
  source: 'store',
};

function makeClient(initial: Session | null = null) {
  let session = initial;
  const order: string[] = [];
  const client = {
    getSession: jest.fn(async () => session),
    signInWithGoogle: jest.fn(async (_idToken: string) => {
      session = SESSION;
      return SESSION;
    }),
    signInWithApple: jest.fn(async (_idToken: string, _nonce?: string) => {
      session = APPLE_SESSION;
      return APPLE_SESSION;
    }),
    signOut: jest.fn(async () => {
      order.push('signOut');
      session = null;
    }),
    deleteAccount: jest.fn(async (_token: string, _provider: 'google' | 'apple') => {
      session = null;
    }),
    refreshEntitlement: jest.fn(async () => undefined),
    registerPushDevice: jest.fn(async () => undefined),
    unregisterPushDevice: jest.fn(async (_token: string) => {
      order.push('unregister');
    }),
  };
  return { client: client as typeof client & ApiClient, order };
}

function makeGoogle(result: GoogleIdTokenResult = { status: 'success', idToken: 'google-token' }) {
  return { requestIdToken: jest.fn(async () => result), signOut: jest.fn(async () => undefined) } satisfies GoogleAuth;
}

function makeApple(result: AppleIdTokenResult = { status: 'success', idToken: 'apple-token', nonce: 'nonce-1' }) {
  return {
    available: jest.fn(async () => true),
    requestIdToken: jest.fn(async () => result),
  } satisfies AppleAuth;
}

function makeStore() {
  const listeners = new Set<(entitlement: Entitlement) => void>();
  const adapter = {
    kind: 'store',
    getOfferings: async () => [],
    purchase: async () => ({ status: 'cancelled' }),
    restore: async () => ({ status: 'nothingToRestore' }),
    refresh: async () => FREE_ENTITLEMENT,
    manageUrl: () => null,
    identify: jest.fn(async (_userId: string | null): Promise<Entitlement | null> => null),
    subscribe: (listener: (entitlement: Entitlement) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  } as unknown as PurchaseAdapter & { identify: jest.Mock };
  const emit = (entitlement: Entitlement) => listeners.forEach((listener) => listener(entitlement));
  return { adapter, emit };
}

async function mount(options: {
  session?: Session | null;
  google?: ReturnType<typeof makeGoogle> | null;
  apple?: ReturnType<typeof makeApple> | null;
  pushToken?: string | null;
}) {
  const { client, order } = makeClient(options.session ?? null);
  const google = options.google === undefined ? makeGoogle() : options.google;
  const apple = options.apple === undefined ? makeApple() : options.apple;
  const store = makeStore();
  const readPushToken = jest.fn(async () => options.pushToken ?? null);
  const seen: { current: AccountValue | null } = { current: null };

  function Probe() {
    seen.current = useAccount();
    return null;
  }
  const Tree = ({ children }: { children?: ReactNode }) => (
    <ProProvider adapter={store.adapter}>
      <AccountProvider client={client} google={google} apple={apple} pushToken={readPushToken}>
        <AccountSync readPushToken={readPushToken} />
        <Probe />
        {children}
      </AccountProvider>
    </ProProvider>
  );
  await render(<Tree />);
  await waitFor(() => expect(seen.current?.status).not.toBe('loading'));
  return { client, google, apple, store, order, readPushToken, account: () => seen.current as AccountValue };
}

describe('account', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts signed out and touches neither the store identity nor the server', async () => {
    const view = await mount({});
    expect(view.account().status).toBe('signedOut');
    expect(view.account().available).toBe(true);
    expect(view.store.adapter.identify).not.toHaveBeenCalled();
    expect(view.client.registerPushDevice).not.toHaveBeenCalled();
    expect(view.client.refreshEntitlement).not.toHaveBeenCalled();
  });

  it('restores a stored session on launch and ties purchases to the account', async () => {
    const view = await mount({ session: SESSION });
    expect(view.account()).toMatchObject({ status: 'signedIn', user: { id: 'user-1', email: 'person@example.com' } });
    await waitFor(() => expect(view.store.adapter.identify).toHaveBeenCalledWith('user-1'));
    // The entitlement the server already knows is not re-sent just because the app opened.
    expect(view.client.refreshEntitlement).not.toHaveBeenCalled();
  });

  it('signs in with Google, identifies the purchaser and registers the device for push', async () => {
    const view = await mount({ pushToken: 'ExponentPushToken[abc]' });
    let outcome = '';
    await act(async () => {
      outcome = await view.account().signInWithGoogle();
    });
    expect(outcome).toBe('success');
    expect(view.client.signInWithGoogle).toHaveBeenCalledWith('google-token');
    expect(view.account()).toMatchObject({ status: 'signedIn', user: { id: 'user-1' } });
    await waitFor(() => expect(view.store.adapter.identify).toHaveBeenCalledWith('user-1'));
    await waitFor(() =>
      expect(view.client.registerPushDevice).toHaveBeenCalledWith(expect.objectContaining({ token: 'ExponentPushToken[abc]', platform: 'ios' })),
    );
  });

  it('signs in with Apple when available', async () => {
    const view = await mount({});
    await waitFor(() => expect(view.account().appleAvailable).toBe(true));
    let outcome = '';
    await act(async () => {
      outcome = await view.account().signInWithApple();
    });
    expect(outcome).toBe('success');
    expect(view.client.signInWithApple).toHaveBeenCalledWith('apple-token', 'nonce-1');
    expect(view.account()).toMatchObject({ status: 'signedIn', user: { id: 'user-apple', provider: 'apple' } });
  });

  it('does not register for push when notifications are not already allowed', async () => {
    const view = await mount({ session: SESSION, pushToken: null });
    await waitFor(() => expect(view.store.adapter.identify).toHaveBeenCalled());
    expect(view.client.registerPushDevice).not.toHaveBeenCalled();
  });

  it('treats closing the Google sheet as nothing happening', async () => {
    const view = await mount({ google: makeGoogle({ status: 'cancelled' }) });
    let outcome = '';
    await act(async () => {
      outcome = await view.account().signInWithGoogle();
    });
    expect(outcome).toBe('cancelled');
    expect(view.client.signInWithGoogle).not.toHaveBeenCalled();
    expect(view.account().status).toBe('signedOut');
  });

  it.each([
    [409, 'conflict'],
    [400, 'unverified'],
    [401, 'failed'],
    [503, 'network'],
  ])('maps a %i from the server to "%s" and forgets the Google account', async (status, expected) => {
    const view = await mount({});
    view.client.signInWithGoogle.mockRejectedValueOnce(new ApiError(status));
    let outcome = '';
    await act(async () => {
      outcome = await view.account().signInWithGoogle();
    });
    expect(outcome).toBe(expected);
    expect(view.google?.signOut).toHaveBeenCalled();
    expect(view.account().status).toBe('signedOut');
  });

  it('reports an offline sign-in as a network problem', async () => {
    const view = await mount({});
    view.client.signInWithGoogle.mockRejectedValueOnce(new NetworkError());
    let outcome = '';
    await act(async () => {
      outcome = await view.account().signInWithGoogle();
    });
    expect(outcome).toBe('network');
  });

  it('unregisters the device while the session still works, then signs out and returns purchases to the device', async () => {
    const view = await mount({ session: SESSION, pushToken: 'ExponentPushToken[abc]' });
    await waitFor(() => expect(view.store.adapter.identify).toHaveBeenCalledWith('user-1'));
    await act(async () => {
      await view.account().signOut();
    });
    expect(view.order).toEqual(['unregister', 'signOut']);
    expect(view.client.unregisterPushDevice).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(view.google?.signOut).toHaveBeenCalled();
    expect(view.account()).toMatchObject({ status: 'signedOut', user: null });
    await waitFor(() => expect(view.store.adapter.identify).toHaveBeenLastCalledWith(null));
  });

  it('signs out even when the server or the token lookup fails', async () => {
    const view = await mount({ session: SESSION, pushToken: 'ExponentPushToken[abc]' });
    view.client.unregisterPushDevice.mockRejectedValueOnce(new NetworkError());
    await act(async () => {
      await view.account().signOut();
    });
    expect(view.client.signOut).toHaveBeenCalled();
    expect(view.account().status).toBe('signedOut');
  });

  it('deletes the account only with a fresh Google token', async () => {
    const view = await mount({ session: SESSION });
    let outcome = '';
    await act(async () => {
      outcome = await view.account().deleteAccount();
    });
    expect(outcome).toBe('deleted');
    expect(view.google?.requestIdToken).toHaveBeenCalled();
    expect(view.client.deleteAccount).toHaveBeenCalledWith('google-token', 'google');
    expect(view.account()).toMatchObject({ status: 'signedOut', user: null });
  });

  it('deletes an Apple account with a fresh Apple identity token', async () => {
    const view = await mount({ session: APPLE_SESSION });
    let outcome = '';
    await act(async () => {
      outcome = await view.account().deleteAccount();
    });
    expect(outcome).toBe('deleted');
    expect(view.apple?.requestIdToken).toHaveBeenCalled();
    expect(view.client.deleteAccount).toHaveBeenCalledWith('apple-token', 'apple');
  });

  it('does nothing when the person backs out of Google during deletion', async () => {
    const view = await mount({ session: SESSION, google: makeGoogle({ status: 'cancelled' }) });
    let outcome = '';
    await act(async () => {
      outcome = await view.account().deleteAccount();
    });
    expect(outcome).toBe('cancelled');
    expect(view.client.deleteAccount).not.toHaveBeenCalled();
    expect(view.account().status).toBe('signedIn');
  });

  it('keeps the account and says so when the step-up is refused or the server fails', async () => {
    const view = await mount({ session: SESSION });
    view.client.deleteAccount.mockRejectedValueOnce(new ApiError(403));
    let outcome = '';
    await act(async () => {
      outcome = await view.account().deleteAccount();
    });
    expect(outcome).toBe('stepUpFailed');
    view.client.deleteAccount.mockRejectedValueOnce(new ApiError(500));
    await act(async () => {
      outcome = await view.account().deleteAccount();
    });
    expect(outcome).toBe('network');
    expect(view.account().status).toBe('signedIn');
  });

  it('asks the server to re-read RevenueCat when the entitlement changes on the device', async () => {
    const view = await mount({ session: SESSION });
    await waitFor(() => expect(view.store.adapter.identify).toHaveBeenCalled());
    await act(async () => {
      view.store.emit(ACTIVE);
    });
    await waitFor(() => expect(view.client.refreshEntitlement).toHaveBeenCalledTimes(1));
    await act(async () => {
      view.store.emit(ACTIVE);
    });
    expect(view.client.refreshEntitlement).toHaveBeenCalledTimes(1);
  });

  it('is unavailable without Google, so no account surface can appear', async () => {
    const view = await mount({ google: null });
    expect(view.account().available).toBe(false);
  });
});
