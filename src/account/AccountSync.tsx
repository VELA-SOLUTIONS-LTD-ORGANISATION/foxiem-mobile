import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { i18n } from '@/i18n';
import { setSentryUser } from '@/lib/telemetry/sentry';
import { usePro } from '@/pro/ProProvider';

import { useAccount } from './AccountProvider';
import { getExpoPushToken } from './pushToken';

/**
 * Keeps three things in step with the signed-in account. It renders nothing and never blocks the app:
 * every call is best effort, because Foxiem works fully without the network and without an account.
 *
 *  1. Store identity: purchases are tied to the Foxiem account (RevenueCat logIn / logOut).
 *  2. Server entitlement: after the entitlement changes on the device, the server re-reads RevenueCat.
 *  3. Push: the Expo token is registered for billing-issue messages (only if notifications are already allowed).
 */
export function AccountSync({ readPushToken = getExpoPushToken }: { readPushToken?: () => Promise<string | null> }) {
  const account = useAccount();
  const pro = usePro();
  const { client, status } = account;
  const userId = account.user?.id ?? null;

  // 1. Store identity (+ opaque Sentry user for crash grouping).
  const identified = useRef<string | null>(null);
  const { identify, available: storeAvailable } = pro;
  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    setSentryUser(userId);
    if (!storeAvailable || identified.current === userId) {
      return;
    }
    const previous = identified.current;
    identified.current = userId;
    if (userId === null && previous === null) {
      return;
    }
    void identify(userId).catch(() => undefined);
  }, [identify, status, storeAvailable, userId]);

  // 2. Server entitlement. The first value seen is only a baseline; later changes trigger one refresh.
  const entitlementKey = `${userId}:${pro.entitlement.status}:${pro.entitlement.plan ?? ''}`;
  const syncedKey = useRef<string | null>(null);
  useEffect(() => {
    if (!client || status !== 'signedIn' || !pro.hydrated) {
      syncedKey.current = null;
      return;
    }
    const previous = syncedKey.current;
    syncedKey.current = entitlementKey;
    if (previous !== null && previous !== entitlementKey) {
      void client.refreshEntitlement().catch(() => undefined);
    }
  }, [client, entitlementKey, pro.hydrated, status]);

  // 3. Push registration.
  const registeredKey = useRef<string | null>(null);
  useEffect(() => {
    if (!client || status !== 'signedIn' || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
      registeredKey.current = null;
      return undefined;
    }
    const platform = Platform.OS;
    let cancelled = false;
    const register = async () => {
      const token = await readPushToken();
      if (!token || cancelled) {
        return;
      }
      const key = `${userId}:${token}:${i18n.language}`;
      if (registeredKey.current === key) {
        return;
      }
      try {
        await client.registerPushDevice({ token, platform, locale: i18n.language });
        registeredKey.current = key;
      } catch {
        // Retried on the next foreground.
      }
    };
    void register();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void register();
      }
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [client, readPushToken, status, userId]);

  return null;
}
