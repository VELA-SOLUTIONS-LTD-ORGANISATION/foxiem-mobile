import { rebuildChain, sortEvents } from '@/domain/events';
import { DEFAULT_TRACKER_ICON } from '@/domain/trackers';
import {
  isTrackerColor,
  isTrackerIntent,
  isTrackerPeriod,
  type CountEvent,
  type CountEventType,
  type EventsByTracker,
  type Tracker,
} from '@/domain/types';

import {
  listFoxiemKeys,
  readJson,
  readJsonResult,
  readManyJson,
  removeKey,
  writeJson,
  writeManyJson,
  type ReadResult,
} from './appStorage';
import { CURRENT_SCHEMA_VERSION, EVENTS_KEY_PREFIX, STORAGE_KEYS, eventsKey, type StorageKey } from './keys';
import {
  legacyDomainFromV1,
  legacyHasUserData,
  parseLegacyDomainV2,
  type LegacyDomain,
} from './legacy';
import { migrateLegacyDomain } from './migration';

export type LoadSource = 'current' | 'migratedV1' | 'migratedV2' | 'fresh' | 'recovered' | 'unreadable';

export type LoadedDomain = {
  trackers: Tracker[];
  events: EventsByTracker;
  source: LoadSource;
  /** Trackers whose history could not be read (kept in quarantine, never deleted). */
  unreadableTrackerIds: string[];
  /** Whether this device already went through first-run (or had 1.0.x data). */
  firstRunCompleted: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function intOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : null;
}

export function parseTracker(value: unknown): Tracker | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string') {
    return null;
  }
  if (!isTrackerIntent(value.intent) || !isTrackerPeriod(value.period) || !isIso(value.createdAt)) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    icon: typeof value.icon === 'string' && value.icon ? value.icon : DEFAULT_TRACKER_ICON,
    color: isTrackerColor(value.color) ? value.color : 'fox',
    intent: value.intent,
    period: value.period,
    target: intOrNull(value.target),
    baseline: intOrNull(value.baseline),
    unit: typeof value.unit === 'string' && value.unit ? value.unit : null,
    step: Math.max(1, intOrNull(value.step) ?? 1),
    startingValue: Math.max(0, intOrNull(value.startingValue) ?? 0),
    notes: typeof value.notes === 'string' ? value.notes : '',
    sortIndex: intOrNull(value.sortIndex) ?? 0,
    archivedAt: isIso(value.archivedAt) ? value.archivedAt : null,
    origin:
      value.origin === 'template' || value.origin === 'migrated' || value.origin === 'custom'
        ? value.origin
        : 'custom',
    templateId: typeof value.templateId === 'string' ? value.templateId : null,
    createdAt: value.createdAt,
    updatedAt: isIso(value.updatedAt) ? value.updatedAt : value.createdAt,
  };
}

const EVENT_TYPES: readonly CountEventType[] = ['increment', 'decrement', 'reset', 'adjust'];

export function parseEvent(value: unknown, trackerId: string): CountEvent | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) {
    return null;
  }
  const type = value.type;
  if (typeof type !== 'string' || !(EVENT_TYPES as readonly string[]).includes(type)) {
    return null;
  }
  const { amount, previousValue, newValue } = value;
  if (
    typeof amount !== 'number' ||
    typeof previousValue !== 'number' ||
    typeof newValue !== 'number' ||
    ![amount, previousValue, newValue].every(Number.isFinite) ||
    !isIso(value.createdAt)
  ) {
    return null;
  }
  const event: CountEvent = {
    id: value.id,
    trackerId,
    type: type as CountEventType,
    amount,
    previousValue,
    newValue,
    createdAt: value.createdAt,
  };
  if (typeof value.note === 'string' && value.note) {
    event.note = value.note;
  }
  if (value.source === 'tap' || value.source === 'entry' || value.source === 'migration') {
    event.source = value.source;
  }
  if (isIso(value.editedAt)) {
    event.editedAt = value.editedAt;
  }
  return event;
}

export function parseEventList(value: unknown, tracker: Tracker): CountEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const events: CountEvent[] = [];
  for (const item of value) {
    const event = parseEvent(item, tracker.id);
    if (event && !seen.has(event.id)) {
      seen.add(event.id);
      events.push(event);
    }
  }
  return rebuildChain(tracker.startingValue, sortEvents(events));
}

export function parseTrackerList(value: unknown): Tracker[] | null {
  if (!isRecord(value) || !Array.isArray(value.trackers)) {
    return null;
  }
  const seen = new Set<string>();
  const trackers: Tracker[] = [];
  for (const item of value.trackers) {
    const tracker = parseTracker(item);
    if (tracker && !seen.has(tracker.id)) {
      seen.add(tracker.id);
      trackers.push(tracker);
    }
  }
  return trackers;
}

async function readLegacy(): Promise<LegacyDomain | null> {
  const [v2, counter, history] = await Promise.all([
    readJson<unknown>(STORAGE_KEYS.legacyCounterDomain),
    readJson<unknown>(STORAGE_KEYS.legacyCounter),
    readJson<unknown>(STORAGE_KEYS.legacyHistory),
  ]);
  const parsedV2 = parseLegacyDomainV2(v2);
  if (parsedV2 && legacyHasUserData(parsedV2)) {
    return parsedV2;
  }
  const v1 = legacyDomainFromV1(counter, history);
  if (v1 && legacyHasUserData(v1)) {
    return v1;
  }
  return parsedV2 ?? v1;
}

async function writeDomain(trackers: readonly Tracker[], events: EventsByTracker): Promise<void> {
  // Shards first, then the tracker index, then the version marker: a crash at any point
  // leaves either the old state or a state that re-running the migration reproduces.
  await writeManyJson(
    trackers.map((tracker): [StorageKey, unknown] => [eventsKey(tracker.id), events[tracker.id] ?? []]),
  );
  await writeJson(STORAGE_KEYS.trackers, { schemaVersion: CURRENT_SCHEMA_VERSION, trackers });
  await writeJson(STORAGE_KEYS.schemaVersion, CURRENT_SCHEMA_VERSION);
}

async function quarantine(reason: string, raw: string): Promise<void> {
  try {
    const existing = await readJson<unknown[]>(STORAGE_KEYS.recovery);
    const list = Array.isArray(existing) ? existing : [];
    await writeJson(STORAGE_KEYS.recovery, [...list, { reason, raw, at: new Date().toISOString() }].slice(-5));
  } catch {
    // Quarantine is best effort; the original key is left untouched either way.
  }
}

async function loadShards(trackers: readonly Tracker[]): Promise<{
  events: EventsByTracker;
  unreadable: string[];
}> {
  const results = await readManyJson(trackers.map((tracker) => eventsKey(tracker.id)));
  const events: EventsByTracker = {};
  const unreadable: string[] = [];
  for (const tracker of trackers) {
    const result: ReadResult<unknown> = results.get(eventsKey(tracker.id)) ?? { status: 'missing' };
    if (result.status === 'corrupt') {
      unreadable.push(tracker.id);
      await quarantine(`events:${tracker.id}`, result.raw);
      events[tracker.id] = [];
      continue;
    }
    events[tracker.id] = result.status === 'ok' ? parseEventList(result.value, tracker) : [];
  }
  return { events, unreadable };
}

async function firstRunDone(): Promise<boolean> {
  const value = await readJson<unknown>(STORAGE_KEYS.firstRun);
  return isRecord(value) && isIso(value.completedAt);
}

export async function markFirstRunCompleted(now: Date = new Date()): Promise<void> {
  await writeJson(STORAGE_KEYS.firstRun, { completedAt: now.toISOString() });
}

async function migrateFromLegacy(defaultTrackerName: string): Promise<LoadedDomain> {
  const legacy = await readLegacy();
  if (!legacy || !legacyHasUserData(legacy)) {
    // Nothing was ever counted: everyone without data gets the new first-run introduction.
    await writeDomain([], {});
    return {
      trackers: [],
      events: {},
      source: 'fresh',
      unreadableTrackerIds: [],
      firstRunCompleted: await firstRunDone(),
    };
  }
  const migrated = migrateLegacyDomain(legacy, { defaultTrackerName });
  await writeDomain(migrated.trackers, migrated.events);
  await markFirstRunCompleted();
  return {
    trackers: migrated.trackers,
    events: migrated.events,
    source: legacy.version === 1 ? 'migratedV1' : 'migratedV2',
    unreadableTrackerIds: [],
    firstRunCompleted: true,
  };
}

/**
 * Load the current domain, migrating 1.0.x data on first launch.
 * Never deletes legacy keys and never treats unreadable data as empty.
 */
export async function loadDomain(options: { defaultTrackerName: string }): Promise<LoadedDomain> {
  const version = await readJson<unknown>(STORAGE_KEYS.schemaVersion);

  if (version !== CURRENT_SCHEMA_VERSION) {
    return migrateFromLegacy(options.defaultTrackerName);
  }

  const index = await readJsonResult<unknown>(STORAGE_KEYS.trackers);
  const trackers = index.status === 'ok' ? parseTrackerList(index.value) : null;

  if (!trackers) {
    // The tracker index is unreadable. Keep the raw value and fall back to the 1.0.x backup.
    if (index.status === 'corrupt') {
      await quarantine('trackers', index.raw);
    }
    const legacy = await readLegacy();
    if (legacy && legacyHasUserData(legacy)) {
      const migrated = migrateLegacyDomain(legacy, { defaultTrackerName: options.defaultTrackerName });
      await writeDomain(migrated.trackers, migrated.events);
      return {
        trackers: migrated.trackers,
        events: migrated.events,
        source: 'recovered',
        unreadableTrackerIds: [],
        firstRunCompleted: true,
      };
    }
    return {
      trackers: [],
      events: {},
      source: index.status === 'corrupt' ? 'unreadable' : 'current',
      unreadableTrackerIds: [],
      firstRunCompleted: await firstRunDone(),
    };
  }

  const { events, unreadable } = await loadShards(trackers);
  await removeOrphanShards(trackers);
  return {
    trackers,
    events,
    source: 'current',
    unreadableTrackerIds: unreadable,
    firstRunCompleted: (await firstRunDone()) || trackers.length > 0,
  };
}

/** Only called after the tracker index parsed successfully. */
async function removeOrphanShards(trackers: readonly Tracker[]): Promise<void> {
  try {
    const known = new Set(trackers.map((tracker) => eventsKey(tracker.id)));
    const keys = await listFoxiemKeys();
    const orphans = keys.filter(
      (key): key is `foxiem.events.${string}` => key.startsWith(EVENTS_KEY_PREFIX) && !known.has(key as `foxiem.events.${string}`),
    );
    for (const key of orphans) {
      await removeKey(key);
    }
  } catch {
    // Orphans are harmless; try again next launch.
  }
}

export async function saveTrackers(trackers: readonly Tracker[]): Promise<void> {
  await writeJson(STORAGE_KEYS.trackers, { schemaVersion: CURRENT_SCHEMA_VERSION, trackers });
}

export async function saveTrackerEvents(trackerId: string, events: readonly CountEvent[]): Promise<void> {
  await writeJson(eventsKey(trackerId), events);
}

export async function removeTrackerEvents(trackerId: string): Promise<void> {
  await removeKey(eventsKey(trackerId));
}
