import { Platform } from 'react-native';

export type AppleIdTokenResult =
  | { status: 'success'; idToken: string; nonce?: string }
  | { status: 'cancelled' }
  | { status: 'failed' }
  | { status: 'unavailable' };

/** Native Sign in with Apple boundary. Tests inject a fake. */
export interface AppleAuth {
  available(): Promise<boolean>;
  requestIdToken(): Promise<AppleIdTokenResult>;
}

type AppleModule = typeof import('expo-apple-authentication');
type CryptoModule = typeof import('expo-crypto');

function randomNonce(length = 32): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Real Apple sign-in. Native modules load lazily so Android, web and unit tests never touch them.
 * Returns null outside iOS.
 */
export function createAppleAuth(): AppleAuth | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  let apple: AppleModule;
  let crypto: CryptoModule | null = null;
  try {
    apple = require('expo-apple-authentication') as AppleModule; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    return null;
  }
  try {
    crypto = require('expo-crypto') as CryptoModule; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    crypto = null;
  }

  return {
    async available() {
      try {
        return await apple.isAvailableAsync();
      } catch {
        return false;
      }
    },
    async requestIdToken() {
      try {
        if (!(await apple.isAvailableAsync())) {
          return { status: 'unavailable' };
        }
        const nonce = randomNonce();
        let hashedNonce: string | undefined;
        if (crypto?.digestStringAsync && crypto.CryptoDigestAlgorithm?.SHA256) {
          hashedNonce = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, nonce);
        }
        const credential = await apple.signInAsync({
          requestedScopes: [apple.AppleAuthenticationScope.FULL_NAME, apple.AppleAuthenticationScope.EMAIL],
          nonce: hashedNonce,
        });
        if (!credential.identityToken) {
          return { status: 'failed' };
        }
        return { status: 'success', idToken: credential.identityToken, nonce: hashedNonce ? nonce : undefined };
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
          return { status: 'cancelled' };
        }
        return { status: 'failed' };
      }
    },
  };
}
