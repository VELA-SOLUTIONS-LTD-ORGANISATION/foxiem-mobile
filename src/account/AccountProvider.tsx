import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { ApiError, createApiClient, NetworkError, type ApiClient } from './apiClient';
import { createAppleAuth, type AppleAuth } from './appleAuth';
import { getAccountConfig, type AccountConfig } from './config';
import { createGoogleAuth, type GoogleAuth } from './googleAuth';
import { getExpoPushToken } from './pushToken';
import { createSecureSessionStore, type AccountUser, type AuthProvider } from './session';

export type SignInOutcome = 'success' | 'cancelled' | 'conflict' | 'unverified' | 'network' | 'failed' | 'unavailable';
export type DeleteOutcome = 'deleted' | 'cancelled' | 'stepUpFailed' | 'network' | 'failed';

type AccountStatus = 'loading' | 'signedOut' | 'signedIn';

export type AccountValue = {
  /** False when this build has no backend / Google configuration: no account surface is shown at all. */
  available: boolean;
  /** True on iOS when Sign in with Apple can be offered next to Google (guideline 4.8). */
  appleAvailable: boolean;
  status: AccountStatus;
  user: AccountUser | null;
  /** True while a sign-in, sign-out or deletion is running. */
  busy: boolean;
  signInWithGoogle: () => Promise<SignInOutcome>;
  signInWithApple: () => Promise<SignInOutcome>;
  /** @deprecated Prefer signInWithGoogle; kept for older call sites. */
  signIn: () => Promise<SignInOutcome>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<DeleteOutcome>;
  /** The API client behind the account, for background sync. Null when unavailable. */
  client: ApiClient | null;
};

const AccountContext = createContext<AccountValue | null>(null);

type Props = {
  children: ReactNode;
  /** Tests and tools can inject their own pieces; production uses the defaults. */
  config?: AccountConfig;
  client?: ApiClient;
  google?: GoogleAuth | null;
  apple?: AppleAuth | null;
  pushToken?: () => Promise<string | null>;
};

function mapSignInError(error: unknown): SignInOutcome {
  if (error instanceof NetworkError) {
    return 'network';
  }
  if (error instanceof ApiError) {
    return error.status === 409 ? 'conflict' : error.status === 400 ? 'unverified' : error.status >= 500 ? 'network' : 'failed';
  }
  return 'failed';
}

export function AccountProvider({
  children,
  config: injectedConfig,
  client: injectedClient,
  google: injectedGoogle,
  apple: injectedApple,
  pushToken = getExpoPushToken,
}: Props) {
  const config = useMemo(() => injectedConfig ?? getAccountConfig(Platform.OS), [injectedConfig]);
  const [loadedStatus, setStatus] = useState<AccountStatus>('loading');
  const [user, setUser] = useState<AccountUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const working = useRef(false);

  const client = useMemo<ApiClient | null>(() => {
    if (injectedClient) {
      return injectedClient;
    }
    if (!config.available) {
      return null;
    }
    return createApiClient({
      baseUrl: config.apiUrl,
      store: createSecureSessionStore(),
      // The server no longer accepts this session (revoked, expired, or the account was deleted elsewhere).
      onSessionEnded: () => {
        setUser(null);
        setStatus('signedOut');
      },
    });
  }, [config, injectedClient]);

  const google = useMemo<GoogleAuth | null>(() => {
    if (injectedGoogle !== undefined) {
      return injectedGoogle;
    }
    return config.available ? createGoogleAuth(config) : null;
  }, [config, injectedGoogle]);

  const apple = useMemo<AppleAuth | null>(() => {
    if (injectedApple !== undefined) {
      return injectedApple;
    }
    return config.available ? createAppleAuth() : null;
  }, [config, injectedApple]);

  const available = client !== null && google !== null;
  // Without a backend there is nothing to load: the person is simply signed out.
  const status: AccountStatus = client ? loadedStatus : 'signedOut';

  useEffect(() => {
    let cancelled = false;
    if (!apple) {
      setAppleReady(false);
      return undefined;
    }
    void apple.available().then((ready) => {
      if (!cancelled) {
        setAppleReady(ready);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [apple]);

  useEffect(() => {
    let cancelled = false;
    if (!client) {
      return undefined;
    }
    void client.getSession().then((session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
        setStatus(session ? 'signedIn' : 'signedOut');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  /** One account operation at a time; a second tap while one is running does nothing. */
  const exclusive = useCallback(async <T,>(run: () => Promise<T>, whenBusy: T): Promise<T> => {
    if (working.current) {
      return whenBusy;
    }
    working.current = true;
    setBusy(true);
    try {
      return await run();
    } finally {
      working.current = false;
      setBusy(false);
    }
  }, []);

  const signInWithGoogle = useCallback(
    () =>
      exclusive<SignInOutcome>(async () => {
        if (!client || !google) {
          return 'failed';
        }
        const token = await google.requestIdToken();
        if (token.status !== 'success') {
          return token.status;
        }
        try {
          const session = await client.signInWithGoogle(token.idToken);
          setUser(session.user);
          setStatus('signedIn');
          return 'success';
        } catch (error) {
          await google.signOut();
          return mapSignInError(error);
        }
      }, 'failed'),
    [client, exclusive, google],
  );

  const signInWithApple = useCallback(
    () =>
      exclusive<SignInOutcome>(async () => {
        if (!client || !apple) {
          return 'failed';
        }
        const token = await apple.requestIdToken();
        if (token.status !== 'success') {
          return token.status;
        }
        try {
          const session = await client.signInWithApple(token.idToken, token.nonce);
          setUser(session.user);
          setStatus('signedIn');
          return 'success';
        } catch (error) {
          return mapSignInError(error);
        }
      }, 'failed'),
    [apple, client, exclusive],
  );

  const signOut = useCallback(
    () =>
      exclusive<void>(async () => {
        if (!client) {
          return;
        }
        // The device must be unregistered while the session can still authorise the call.
        try {
          const token = await pushToken();
          if (token) {
            await client.unregisterPushDevice(token);
          }
        } catch {
          // Offline: the server drops the token later when Expo reports it unreachable.
        }
        await client.signOut();
        await google?.signOut();
        setUser(null);
        setStatus('signedOut');
      }, undefined),
    [client, exclusive, google, pushToken],
  );

  const deleteAccount = useCallback(
    () =>
      exclusive<DeleteOutcome>(async () => {
        if (!client || !user) {
          return 'failed';
        }
        const provider: AuthProvider = user.provider;
        // Deleting is irreversible, so the same provider is asked again: the server accepts only a fresh token of this account.
        let stepUpSecret: string | null = null;
        if (provider === 'apple') {
          if (!apple) {
            return 'failed';
          }
          const token = await apple.requestIdToken();
          if (token.status !== 'success') {
            return token.status === 'cancelled' ? 'cancelled' : 'failed';
          }
          stepUpSecret = token.idToken;
        } else {
          if (!google) {
            return 'failed';
          }
          const token = await google.requestIdToken();
          if (token.status !== 'success') {
            return token.status === 'cancelled' ? 'cancelled' : 'failed';
          }
          stepUpSecret = token.idToken;
        }
        try {
          await client.deleteAccount(stepUpSecret, provider);
        } catch (error) {
          if (error instanceof NetworkError) {
            return 'network';
          }
          if (error instanceof ApiError) {
            return error.status === 401 || error.status === 403 ? 'stepUpFailed' : error.status >= 500 ? 'network' : 'failed';
          }
          return 'failed';
        }
        await google?.signOut();
        setUser(null);
        setStatus('signedOut');
        return 'deleted';
      }, 'failed'),
    [apple, client, exclusive, google, user],
  );

  const value = useMemo<AccountValue>(
    () => ({
      available,
      appleAvailable: Boolean(apple && appleReady),
      status,
      user,
      busy,
      signInWithGoogle,
      signInWithApple,
      signIn: signInWithGoogle,
      signOut,
      deleteAccount,
      client,
    }),
    [available, apple, appleReady, status, user, busy, signInWithGoogle, signInWithApple, signOut, deleteAccount, client],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
}
