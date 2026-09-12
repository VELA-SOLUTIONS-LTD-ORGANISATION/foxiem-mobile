import { Linking } from 'react-native';

export function isConfiguredExternalUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function openExternalUrl(value: string): Promise<boolean> {
  if (!isConfiguredExternalUrl(value)) {
    return false;
  }

  const url = value.trim();

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
