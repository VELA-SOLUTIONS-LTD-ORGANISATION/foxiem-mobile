import AsyncStorage from '@react-native-async-storage/async-storage';

import { FOXIEM_STORAGE_KEYS, STORAGE_KEYS, type StorageKey } from './keys';

export async function readJson<T>(key: StorageKey): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

export async function writeJson<T>(key: StorageKey, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: StorageKey): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function resetFoxiemAppData(): Promise<void> {
  await AsyncStorage.multiRemove([...FOXIEM_STORAGE_KEYS]);
}

export { STORAGE_KEYS };
