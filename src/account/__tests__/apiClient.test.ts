import { ApiError, createApiClient, NetworkError } from '../apiClient';
import { createMemorySessionStore, type Session } from '../session';

const NOW = 1_800_000_000_000;

function tokenBody(access: string, refresh: string, extra: Record<string, unknown> = {}) {
  return { accessToken: access, refreshToken: refresh, tokenType: 'Bearer', expiresIn: 900, ...extra };
}

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

function json(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) {
        throw new Error('no body');
      }
      return body;
    },
  } as Response;
}

function setup(handler: (call: Call, index: number) => Response | Promise<Response>, session: Session | null = null) {
  const calls: Call[] = [];
  const fetchImpl = jest.fn(async (url: string, init: RequestInit) => {
    const call: Call = {
      url,
      method: String(init.method),
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return handler(call, calls.length - 1);
  });
  const store = createMemorySessionStore(session);
  const onSessionEnded = jest.fn();
  const client = createApiClient({
    baseUrl: 'https://api.foxiem.app',
    store,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    now: () => NOW,
    onSessionEnded,
  });
  return { client, calls, store, onSessionEnded };
}

const live: Session = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessExpiresAt: NOW + 10 * 60_000,
  user: { id: 'u-1', email: 'person@example.com' },
};

describe('sign-in', () => {
  it('exchanges the Google ID token and stores the session', async () => {
    const { client, calls, store } = setup(() => json(200, tokenBody('a', 'r', { user: { id: 'u-1', email: 'person@example.com', roles: ['USER'] } })));
    const session = await client.signInWithGoogle('google-id-token');
    expect(calls[0]).toMatchObject({ url: 'https://api.foxiem.app/api/v1/auth/google', method: 'POST', body: { idToken: 'google-id-token' } });
    expect(calls[0]?.headers.Authorization).toBeUndefined();
    expect(session).toEqual({ accessToken: 'a', refreshToken: 'r', accessExpiresAt: NOW + 900_000, user: { id: 'u-1', email: 'person@example.com' } });
    await expect(store.load()).resolves.toEqual(session);
  });

  it('surfaces the status for a rejected token or a conflicting e-mail, and stores nothing', async () => {
    const conflict = setup(() => json(409, { code: 'foxiem.ACCOUNT_CONFLICT' }));
    await expect(conflict.client.signInWithGoogle('t')).rejects.toMatchObject({ status: 409, code: 'foxiem.ACCOUNT_CONFLICT' });
    await expect(conflict.store.load()).resolves.toBeNull();
  });

  it('rejects a malformed token response instead of storing half a session', async () => {
    const { client, store } = setup(() => json(200, { accessToken: 'a' }));
    await expect(client.signInWithGoogle('t')).rejects.toBeInstanceOf(ApiError);
    await expect(store.load()).resolves.toBeNull();
  });

  it('reports a network failure separately', async () => {
    const { client } = setup(() => Promise.reject(new Error('offline')));
    await expect(client.signInWithGoogle('t')).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('authenticated requests', () => {
  it('sends the access token and does not refresh a live one', async () => {
    const { client, calls } = setup(() => json(204), live);
    await client.registerPushDevice({ token: 'ExponentPushToken[x]', platform: 'ios', locale: 'en' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: 'PUT', url: 'https://api.foxiem.app/api/v1/me/push-devices' });
    expect(calls[0]?.headers.Authorization).toBe('Bearer access-1');
  });

  it('refreshes a token that is about to expire before using it', async () => {
    const { client, calls, store } = setup((call) => (call.url.endsWith('/api/auth/refresh') ? json(200, tokenBody('access-2', 'refresh-2')) : json(204)), {
      ...live,
      accessExpiresAt: NOW + 5_000,
    });
    await client.refreshEntitlement();
    expect(calls.map((call) => call.url.replace('https://api.foxiem.app', ''))).toEqual(['/api/auth/refresh', '/api/v1/me/entitlement/refresh']);
    expect(calls[0]?.body).toEqual({ refreshToken: 'refresh-1' });
    expect(calls[1]?.headers.Authorization).toBe('Bearer access-2');
    await expect(store.load()).resolves.toMatchObject({ accessToken: 'access-2', refreshToken: 'refresh-2', user: { id: 'u-1' } });
  });

  it('retries once after a 401 with a refreshed token', async () => {
    const { client, calls } = setup((call, index) => {
      if (call.url.endsWith('/api/auth/refresh')) return json(200, tokenBody('access-2', 'refresh-2'));
      return index === 0 ? json(401) : json(204);
    }, live);
    await client.unregisterPushDevice('ExponentPushToken[x]');
    expect(calls).toHaveLength(3);
    expect(calls[0]?.headers.Authorization).toBe('Bearer access-1');
    expect(calls[2]?.headers.Authorization).toBe('Bearer access-2');
    expect(calls[2]).toMatchObject({ method: 'DELETE', body: { token: 'ExponentPushToken[x]' } });
  });

  it('shares one refresh between concurrent requests', async () => {
    const { client, calls } = setup((call) => (call.url.endsWith('/api/auth/refresh') ? json(200, tokenBody('access-2', 'refresh-2')) : json(204)), {
      ...live,
      accessExpiresAt: NOW,
    });
    await Promise.all([client.refreshEntitlement(), client.refreshEntitlement(), client.unregisterPushDevice('t')]);
    expect(calls.filter((call) => call.url.endsWith('/api/auth/refresh'))).toHaveLength(1);
  });

  it('does not replay a rotated refresh token when two requests are rejected together', async () => {
    let refreshes = 0;
    const { client } = setup((call) => {
      if (call.url.endsWith('/api/auth/refresh')) {
        refreshes += 1;
        return json(200, tokenBody('access-2', 'refresh-2'));
      }
      return call.headers.Authorization === 'Bearer access-1' ? json(401) : json(204);
    }, live);
    await Promise.all([client.refreshEntitlement(), client.unregisterPushDevice('t')]);
    expect(refreshes).toBe(1);
  });

  it('ends the session when the server rejects the refresh token', async () => {
    const { client, store, onSessionEnded } = setup((call) => (call.url.endsWith('/api/auth/refresh') ? json(401) : json(401)), live);
    await expect(client.refreshEntitlement()).rejects.toMatchObject({ status: 401 });
    await expect(store.load()).resolves.toBeNull();
    await expect(client.getSession()).resolves.toBeNull();
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh fails only because the network or server is down', async () => {
    const offline = setup(() => Promise.reject(new Error('offline')), { ...live, accessExpiresAt: NOW });
    await expect(offline.client.refreshEntitlement()).rejects.toBeInstanceOf(NetworkError);
    await expect(offline.store.load()).resolves.toMatchObject({ refreshToken: 'refresh-1' });
    expect(offline.onSessionEnded).not.toHaveBeenCalled();

    const down = setup(() => json(503), { ...live, accessExpiresAt: NOW });
    await expect(down.client.refreshEntitlement()).rejects.toMatchObject({ status: 503 });
    await expect(down.store.load()).resolves.toMatchObject({ refreshToken: 'refresh-1' });
  });

  it('refuses to call the API while signed out', async () => {
    const { client, calls } = setup(() => json(204));
    await expect(client.refreshEntitlement()).rejects.toMatchObject({ status: 401, code: 'signedOut' });
    expect(calls).toHaveLength(0);
  });
});

describe('sign-out and deletion', () => {
  it('revokes on the server and clears locally', async () => {
    const { client, calls, store } = setup(() => json(204), live);
    await client.signOut();
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'https://api.foxiem.app/api/auth/logout' });
    expect(calls[0]?.headers.Authorization).toBe('Bearer access-1');
    await expect(store.load()).resolves.toBeNull();
  });

  it('still signs out locally when the server cannot be reached', async () => {
    const { client, store } = setup(() => Promise.reject(new Error('offline')), live);
    await client.signOut();
    await expect(store.load()).resolves.toBeNull();
    await expect(client.getSession()).resolves.toBeNull();
  });

  it('deletes the account with the step-up token, then forgets the session', async () => {
    const { client, calls, store } = setup(() => json(204), live);
    await client.deleteAccount('fresh-google-id-token');
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.foxiem.app/api/account/delete',
      body: { stepUp: { method: 'google', secret: 'fresh-google-id-token' } },
    });
    await expect(store.load()).resolves.toBeNull();
  });

  it('keeps the session when deletion fails', async () => {
    const { client, store } = setup(() => json(500), live);
    await expect(client.deleteAccount('token')).rejects.toMatchObject({ status: 500 });
    await expect(store.load()).resolves.not.toBeNull();
  });
});
