export type AuthProvider = 'google' | 'apple';

export type AccountUser = { id: string; email: string; provider: AuthProvider };

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds after which the access token must be replaced. */
  accessExpiresAt: number;
  user: AccountUser;
};

/** Where the session lives between launches. Production uses the OS keychain / keystore. */
export interface SessionStore {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}

const SESSION_KEY = 'foxiem.account.session';

export function parseSession(raw: unknown): Session | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const user = value.user as Record<string, unknown> | undefined;
  if (
    typeof value.accessToken !== 'string' ||
    typeof value.refreshToken !== 'string' ||
    typeof value.accessExpiresAt !== 'number' ||
    typeof user?.id !== 'string' ||
    typeof user?.email !== 'string' ||
    !value.accessToken ||
    !value.refreshToken
  ) {
    return null;
  }
  const provider = user.provider === 'apple' ? 'apple' : 'google';
  return {
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    accessExpiresAt: value.accessExpiresAt,
    user: { id: user.id, email: user.email, provider },
  };
}

/** Keeps the session in the platform's secure storage. It is never written to AsyncStorage or logged. */
export function createSecureSessionStore(): SessionStore {
  // Loaded lazily so tests, web and Expo Go without the native module never touch it.
  const store = () => require('expo-secure-store') as typeof import('expo-secure-store'); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    async load() {
      try {
        const raw = await store().getItemAsync(SESSION_KEY);
        return raw ? parseSession(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    async save(session) {
      const secure = store();
      await secure.setItemAsync(SESSION_KEY, JSON.stringify(session), {
        keychainAccessible: secure.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    },
    async clear() {
      try {
        await store().deleteItemAsync(SESSION_KEY);
      } catch {
        // Nothing stored, or the keystore is unavailable: there is nothing more to remove.
      }
    },
  };
}

export function createMemorySessionStore(initial: Session | null = null): SessionStore {
  let current = initial;
  return {
    load: async () => current,
    save: async (session) => {
      current = session;
    },
    clear: async () => {
      current = null;
    },
  };
}
