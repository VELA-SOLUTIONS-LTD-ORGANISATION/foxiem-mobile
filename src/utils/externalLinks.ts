import { Linking } from 'react-native';

export function isConfiguredExternalUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

/** Opens a link without `canOpenURL`, which needs per-scheme manifest queries on Android 11+. */
export async function openExternalUrl(value: string): Promise<boolean> {
  if (!isConfiguredExternalUrl(value)) {
    return false;
  }
  try {
    await Linking.openURL(value.trim());
    return true;
  } catch {
    return false;
  }
}
