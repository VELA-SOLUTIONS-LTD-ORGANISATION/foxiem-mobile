import AsyncStorage from '@react-native-async-storage/async-storage';

import { FOXIEM_KEY_PREFIX, type StorageKey } from './keys';

export type ReadResult<T> =
  | { status: 'missing' }
  | { status: 'ok'; value: T }
  | { status: 'corrupt'; raw: string };

/** Distinguishes a missing key from unreadable JSON so callers never mistake corruption for "empty". */
export async function readJsonResult<T>(key: StorageKey): Promise<ReadResult<T>> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) {
    return { status: 'missing' };
  }
  try {
    return { status: 'ok', value: JSON.parse(raw) as T };
  } catch {
    return { status: 'corrupt', raw };
  }
}

export async function readJson<T>(key: StorageKey): Promise<T | null> {
  const result = await readJsonResult<T>(key);
  return result.status === 'ok' ? result.value : null;
}

export async function readManyJson(keys: readonly StorageKey[]): Promise<Map<string, ReadResult<unknown>>> {
  const results = new Map<string, ReadResult<unknown>>();
  if (keys.length === 0) {
    return results;
  }
  const pairs = await AsyncStorage.multiGet([...keys]);
  for (const [key, raw] of pairs) {
    if (raw == null) {
      results.set(key, { status: 'missing' });
      continue;
    }
    try {
      results.set(key, { status: 'ok', value: JSON.parse(raw) });
    } catch {
      results.set(key, { status: 'corrupt', raw });
    }
  }
  return results;
}

export async function writeJson<T>(key: StorageKey, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function writeManyJson(entries: readonly [StorageKey, unknown][]): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  await AsyncStorage.multiSet(entries.map(([key, value]) => [key, JSON.stringify(value)]));
}

export async function removeKey(key: StorageKey): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function listFoxiemKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.startsWith(FOXIEM_KEY_PREFIX));
}

/** Removes every Foxiem-owned key and nothing else (never `AsyncStorage.clear`). */
export async function resetFoxiemAppData(): Promise<void> {
  const keys = await listFoxiemKeys();
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
}
