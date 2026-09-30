import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { parseActions, type InboxBridge } from './inbox';
import { APP_GROUP, WIDGET_KEYS, type WidgetSnapshot } from './model';
import { loadWatchModule, type WatchModule } from './watch';

/**
 * Everything platform-specific about talking to widgets and the Watch. The rest of the app depends on
 * `SurfaceBridge` only, so it is testable with a fake and inert on web.
 */
export type SurfaceBridge = {
  /** False where there is nothing to publish to (web, Expo Go without native modules). */
  readonly supported: boolean;
  publishSnapshot(snapshot: WidgetSnapshot): Promise<void>;
  inbox: InboxBridge;
  /** Reset Foxiem: forget everything shared with widgets and the Watch. */
  clear(): Promise<void>;
};

export const inertBridge: SurfaceBridge = {
  supported: false,
  publishSnapshot: async () => undefined,
  inbox: { readInbox: async () => [] },
  clear: async () => undefined,
};

type ExtensionStorageLike = {
  set(key: string, value?: string): void;
  get(key: string): string | null;
  remove(key: string): void;
};
type ExtensionStorageStatics = { reloadWidget(name?: string): void };

function loadExtensionStorage(): { storage: ExtensionStorageLike; statics: ExtensionStorageStatics } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@bacons/apple-targets') as {
      ExtensionStorage: (new (group: string) => ExtensionStorageLike) & ExtensionStorageStatics;
    };
    return { storage: new module.ExtensionStorage(APP_GROUP), statics: module.ExtensionStorage };
  } catch {
    return null;
  }
}

export function createIosBridge(input: {
  extension: { storage: ExtensionStorageLike; statics: ExtensionStorageStatics };
  watch: WatchModule | null;
}): SurfaceBridge {
  const { storage, statics } = input.extension;
  const { watch } = input;
  return {
    supported: true,
    async publishSnapshot(snapshot) {
      const json = JSON.stringify(snapshot);
      storage.set(WIDGET_KEYS.snapshot, json);
      statics.reloadWidget();
      try {
        watch?.sendSnapshot(json);
      } catch {
        // The Watch is optional; a missing or unpaired watch never blocks widgets.
      }
    },
    inbox: {
      async readInbox() {
        const fromWidgets = parseActions(storage.get(WIDGET_KEYS.inbox));
        let fromWatch: ReturnType<typeof parseActions> = [];
        try {
          fromWatch = parseActions(watch ? await watch.readInbox() : null);
        } catch {
          fromWatch = [];
        }
        const seen = new Set<string>();
        return [...fromWidgets, ...fromWatch].filter((action) => !seen.has(action.id) && seen.add(action.id));
      },
      async afterApply(ids) {
        try {
          await watch?.acknowledge(ids);
        } catch {
          // Unacknowledged watch presses are ignored next time by the ledger.
        }
      },
    },
    async clear() {
      storage.remove(WIDGET_KEYS.snapshot);
      storage.remove(WIDGET_KEYS.inbox);
      statics.reloadWidget();
      try {
        watch?.sendSnapshot('');
      } catch {
        // Nothing to clear.
      }
    },
  };
}

export function createAndroidBridge(input: { refresh: () => Promise<void> }): SurfaceBridge {
  return {
    supported: true,
    async publishSnapshot(snapshot) {
      await AsyncStorage.setItem(WIDGET_KEYS.snapshot, JSON.stringify(snapshot));
      await input.refresh();
    },
    inbox: {
      async readInbox() {
        return AsyncStorage.getItem(WIDGET_KEYS.inbox);
      },
    },
    async clear() {
      await AsyncStorage.multiRemove([WIDGET_KEYS.snapshot, WIDGET_KEYS.inbox, WIDGET_KEYS.config]);
      await input.refresh();
    },
  };
}

let cached: SurfaceBridge | null = null;

/** The bridge for this runtime; created lazily so unit tests and web never load native modules. */
export function getSurfaceBridge(): SurfaceBridge {
  if (cached) {
    return cached;
  }
  if (Platform.OS === 'ios') {
    const extension = loadExtensionStorage();
    cached = extension ? createIosBridge({ extension, watch: loadWatchModule() }) : inertBridge;
  } else if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { refreshAndroidWidgets } = require('./android/handler') as typeof import('./android/handler');
      cached = createAndroidBridge({ refresh: refreshAndroidWidgets });
    } catch {
      cached = inertBridge;
    }
  } else {
    cached = inertBridge;
  }
  return cached;
}

/** Tests only. */
export function setSurfaceBridgeForTests(bridge: SurfaceBridge | null): void {
  cached = bridge;
}
