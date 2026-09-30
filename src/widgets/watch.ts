import { Platform } from 'react-native';

/**
 * JS side of the local `foxiem-watch` iOS module (modules/foxiem-watch), a thin WatchConnectivity wrapper.
 * It only carries opaque JSON between the phone app and the Watch app; all rules live in `src/widgets`.
 */
export type WatchStatus = {
  /** WCSession is supported on this device (iPhone, not iPad). */
  supported: boolean;
  paired: boolean;
  appInstalled: boolean;
};

export type WatchModule = {
  getStatus(): WatchStatus;
  /** Latest state for the Watch; an empty string clears it. Delivered as the application context. */
  sendSnapshot(json: string): void;
  /** JSON array of presses the Watch recorded that the app has not acknowledged yet. */
  readInbox(): Promise<string>;
  acknowledge(ids: string[]): Promise<void>;
  addListener?(event: 'onInbox' | 'onStatus', listener: () => void): { remove(): void };
};

export const NO_WATCH: WatchStatus = { supported: false, paired: false, appInstalled: false };

export function loadWatchModule(): WatchModule | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const core = require('expo-modules-core') as { requireOptionalNativeModule?: (name: string) => unknown };
    const native = core.requireOptionalNativeModule?.('FoxiemWatch') as WatchModule | null | undefined;
    return native ?? null;
  } catch {
    return null;
  }
}

export function readWatchStatus(module: WatchModule | null = loadWatchModule()): WatchStatus {
  try {
    return module ? module.getStatus() : NO_WATCH;
  } catch {
    return NO_WATCH;
  }
}
