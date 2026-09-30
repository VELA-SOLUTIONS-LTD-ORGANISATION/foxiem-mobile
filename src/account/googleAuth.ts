import type { AccountConfig } from './config';

export type GoogleIdTokenResult = { status: 'success'; idToken: string } | { status: 'cancelled' } | { status: 'failed' };

/** The boundary to Google's native sign-in. Tests provide a fake. */
export interface GoogleAuth {
  /** Shows Google's account picker and returns an ID token for this app's backend. */
  requestIdToken(): Promise<GoogleIdTokenResult>;
  /** Forgets the Google account on this device (does not affect the Foxiem account). */
  signOut(): Promise<void>;
}

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

/**
 * Real Google sign-in. The native module is loaded lazily so Expo Go, web and unit tests never touch
 * it; returns null when it is not linked in this runtime.
 */
export function createGoogleAuth(config: Extract<AccountConfig, { available: true }>): GoogleAuth | null {
  let sdk: GoogleSigninModule;
  try {
    sdk = require('@react-native-google-signin/google-signin') as GoogleSigninModule; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    return null;
  }
  const { GoogleSignin, isErrorWithCode, statusCodes } = sdk;
  if (!GoogleSignin || typeof GoogleSignin.configure !== 'function') {
    return null;
  }

  let configured = false;
  const ensureConfigured = () => {
    if (!configured) {
      // Requesting the ID token for the web client id is what makes its audience match the backend's allow-list.
      GoogleSignin.configure({
        webClientId: config.webClientId,
        ...(config.iosClientId ? { iosClientId: config.iosClientId } : {}),
        scopes: ['email', 'profile'],
      });
      configured = true;
    }
  };

  return {
    async requestIdToken() {
      try {
        ensureConfigured();
        const response = await GoogleSignin.signIn();
        if (response.type !== 'success') {
          return { status: 'cancelled' };
        }
        return response.data.idToken ? { status: 'success', idToken: response.data.idToken } : { status: 'failed' };
      } catch (error) {
        if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
          return { status: 'cancelled' };
        }
        return { status: 'failed' };
      }
    },

    async signOut() {
      try {
        ensureConfigured();
        await GoogleSignin.signOut();
      } catch {
        // Nothing was signed in.
      }
    },
  };
}
