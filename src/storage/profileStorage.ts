import type { UserProfile } from '@/state/types';

import { readJson, writeJson } from './appStorage';
import { STORAGE_KEYS } from './keys';

export async function getStoredProfile(): Promise<UserProfile | null> {
  return readJson<UserProfile>(STORAGE_KEYS.profile);
}

export async function saveStoredProfile(profile: UserProfile): Promise<void> {
  await writeJson(STORAGE_KEYS.profile, profile);
}
