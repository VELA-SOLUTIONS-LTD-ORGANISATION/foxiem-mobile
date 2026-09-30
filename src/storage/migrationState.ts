import { readJson, writeJson } from './appStorage';
import { STORAGE_KEYS } from './keys';

/**
 * Where the 1.x → 2.0 migration stands. `foxiem.schemaVersion === 3` is still the one flag that
 * says "the live keys are the app's data"; this record explains how the device got there.
 *
 * - `started`   the transform is running; live keys may hold a partial or session-only result.
 * - `staged`    the merged result is fully written to the live keys but not yet committed.
 * - `committed` schema 3 is in force. Legacy keys stay on the device as a backup.
 */
export type MigrationState = 'started' | 'staged' | 'committed';

export type MigrationSource = 'v1' | 'v2' | 'none' | 'recovery';

export type MigrationRecord = {
  state: MigrationState;
  source: MigrationSource;
  attempts: number;
  startedAt: string;
  stagedAt: string | null;
  committedAt: string | null;
  /** Set when the tracker index had to be rebuilt; orphaned history is then never deleted. */
  recoveredAt: string | null;
};

function isIso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function parseMigrationRecord(value: unknown): MigrationRecord | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.state !== 'started' && record.state !== 'staged' && record.state !== 'committed') {
    return null;
  }
  const source =
    record.source === 'v1' || record.source === 'v2' || record.source === 'none' || record.source === 'recovery'
      ? record.source
      : 'none';
  return {
    state: record.state,
    source,
    attempts: typeof record.attempts === 'number' && record.attempts > 0 ? Math.floor(record.attempts) : 1,
    startedAt: isIso(record.startedAt) ? record.startedAt : new Date(0).toISOString(),
    stagedAt: isIso(record.stagedAt) ? record.stagedAt : null,
    committedAt: isIso(record.committedAt) ? record.committedAt : null,
    recoveredAt: isIso(record.recoveredAt) ? record.recoveredAt : null,
  };
}

export async function readMigrationRecord(): Promise<MigrationRecord | null> {
  try {
    return parseMigrationRecord(await readJson<unknown>(STORAGE_KEYS.migration));
  } catch {
    return null;
  }
}

export async function writeMigrationRecord(record: MigrationRecord): Promise<void> {
  await writeJson(STORAGE_KEYS.migration, record);
}
