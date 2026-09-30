import type { AccountUser, Session, SessionStore } from './session';

/** The server answered with an error status. Messages are never parsed or shown; only the status matters. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(`API ${status}${code ? ` ${code}` : ''}`);
    this.name = 'ApiError';
  }
}

/** The request never got an answer (offline, timeout, DNS, TLS). The session is kept. */
export class NetworkError extends Error {
  constructor() {
    super('Network unavailable');
    this.name = 'NetworkError';
  }
}

export type PushDeviceInput = { token: string; platform: 'ios' | 'android'; locale: string };

export interface ApiClient {
  /** The stored session, or null when signed out. */
  getSession(): Promise<Session | null>;
  signInWithGoogle(idToken: string): Promise<Session>;
  signInWithApple(idToken: string, nonce?: string): Promise<Session>;
  /** Revokes the session on the server (best effort) and always clears it locally. */
  signOut(): Promise<void>;
  /**
   * Permanently deletes the account. `stepUpIdToken` is a fresh Google ID token or Apple identity
   * token of the same account; `provider` selects the step-up method the server expects.
   */
  deleteAccount(stepUpIdToken: string, provider: 'google' | 'apple'): Promise<void>;
  /** Asks the server to re-read this customer from RevenueCat. Best effort; callers ignore failures. */
  refreshEntitlement(): Promise<void>;
  registerPushDevice(device: PushDeviceInput): Promise<void>;
  unregisterPushDevice(token: string): Promise<void>;
}

type ClientOptions = {
  baseUrl: string;
  store: SessionStore;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
  /** Called once when the server no longer accepts the refresh token (revoked, expired, account deleted). */
  onSessionEnded?: () => void;
};

type TokenBody = {
  accessToken?: unknown;
  refreshToken?: unknown;
  expiresIn?: unknown;
  user?: { id?: unknown; email?: unknown; username?: unknown };
};

/** Replace the access token slightly before it expires so a request never leaves with a dead one. */
const EXPIRY_MARGIN_MS = 30_000;

function sessionFrom(
  body: TokenBody,
  now: number,
  fallbackUser: AccountUser | null,
  provider: AccountUser['provider'],
): Session {
  const { accessToken, refreshToken, expiresIn } = body;
  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' || typeof expiresIn !== 'number' || !accessToken || !refreshToken) {
    throw new ApiError(502, 'malformed');
  }
  const id = typeof body.user?.id === 'string' ? body.user.id : fallbackUser?.id;
  const email =
    typeof body.user?.email === 'string' ? body.user.email : typeof body.user?.username === 'string' ? body.user.username : fallbackUser?.email;
  if (!id || !email) {
    throw new ApiError(502, 'malformed');
  }
  return { accessToken, refreshToken, accessExpiresAt: now + expiresIn * 1000, user: { id, email, provider } };
}

export function createApiClient(options: ClientOptions): ApiClient {
  const { baseUrl, store, onSessionEnded } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const now = options.now ?? Date.now;

  let cached: Session | null | undefined;
  let refreshing: Promise<Session> | null = null;

  const read = async (): Promise<Session | null> => {
    if (cached === undefined) {
      cached = await store.load();
    }
    return cached;
  };

  const write = async (session: Session | null): Promise<void> => {
    cached = session;
    if (session) {
      await store.save(session);
    } else {
      await store.clear();
    }
  };

  async function send(method: string, path: string, init: { body?: unknown; accessToken?: string } = {}): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(init.accessToken ? { Authorization: `Bearer ${init.accessToken}` } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
    } catch {
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
    }
    let payload: unknown;
    if (response.status !== 204) {
      try {
        payload = await response.json();
      } catch {
        payload = undefined;
      }
    }
    if (!response.ok) {
      const code = (payload as { code?: unknown } | undefined)?.code;
      throw new ApiError(response.status, typeof code === 'string' ? code : undefined);
    }
    return payload;
  }

  const refresh = async (stale: Session): Promise<Session> => {
    // Refresh tokens rotate. A request that started before another refresh finished must use the new
    // session, not replay the old refresh token (which the server treats as reuse).
    const current = await read();
    if (!current) {
      throw new ApiError(401, 'signedOut');
    }
    if (current.refreshToken !== stale.refreshToken) {
      return current;
    }
    refreshing ??= (async () => {
      try {
        const body = (await send('POST', '/api/auth/refresh', { body: { refreshToken: current.refreshToken } })) as TokenBody;
        const next = sessionFrom(body, now(), current.user, current.user.provider);
        await write(next);
        return next;
      } catch (error) {
        if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
          await write(null);
          onSessionEnded?.();
        }
        throw error;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  };

  async function authed(method: string, path: string, body?: unknown): Promise<unknown> {
    let session = await read();
    if (!session) {
      throw new ApiError(401, 'signedOut');
    }
    if (session.accessExpiresAt - now() < EXPIRY_MARGIN_MS) {
      session = await refresh(session);
    }
    try {
      return await send(method, path, { body, accessToken: session.accessToken });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The server may have revoked or rotated the access token early; one refresh, one retry.
        session = await refresh(session);
        return send(method, path, { body, accessToken: session.accessToken });
      }
      throw error;
    }
  }

  return {
    getSession: read,

    async signInWithGoogle(idToken) {
      const body = (await send('POST', '/api/v1/auth/google', { body: { idToken } })) as TokenBody;
      const session = sessionFrom(body, now(), null, 'google');
      await write(session);
      return session;
    },

    async signInWithApple(idToken, nonce) {
      const body = (await send('POST', '/api/v1/auth/apple', {
        body: nonce ? { idToken, nonce } : { idToken },
      })) as TokenBody;
      const session = sessionFrom(body, now(), null, 'apple');
      await write(session);
      return session;
    },

    async signOut() {
      const session = await read();
      try {
        if (session) {
          await send('POST', '/api/auth/logout', { accessToken: session.accessToken });
        }
      } catch {
        // Offline or already revoked: the local session still has to go.
      } finally {
        await write(null);
      }
    },

    async deleteAccount(stepUpIdToken, provider) {
      await authed('POST', '/api/account/delete', { stepUp: { method: provider, secret: stepUpIdToken } });
      await write(null);
    },

    async refreshEntitlement() {
      await authed('POST', '/api/v1/me/entitlement/refresh');
    },

    async registerPushDevice(device) {
      await authed('PUT', '/api/v1/me/push-devices', device);
    },

    async unregisterPushDevice(token) {
      await authed('DELETE', '/api/v1/me/push-devices', { token });
    },
  };
}
