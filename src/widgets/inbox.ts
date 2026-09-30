import type { WidgetAction, WidgetDirection } from './model';

/** Inbox and ledger sizes: the ledger must always outlive anything the inbox can still hold. */
export const INBOX_LIMIT = 200;
export const LEDGER_LIMIT = 500;
/** Presses stamped further ahead than this (clock changes) are treated as "now". */
export const FUTURE_SKEW_MS = 5 * 60_000;

function isDirection(value: unknown): value is WidgetDirection {
  return value === 'up' || value === 'down';
}

function parseJson(raw: unknown): unknown {
  if (typeof raw !== 'string' || raw.length === 0) {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Reads whatever a widget or the Watch left behind, dropping anything malformed. */
export function parseActions(raw: unknown): WidgetAction[] {
  const value = parseJson(raw);
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const actions: WidgetAction[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const at = typeof record.at === 'number' ? record.at : Number(record.at);
    if (
      typeof record.id !== 'string' ||
      record.id.length === 0 ||
      typeof record.trackerId !== 'string' ||
      record.trackerId.length === 0 ||
      !isDirection(record.direction) ||
      !Number.isFinite(at) ||
      seen.has(record.id)
    ) {
      continue;
    }
    seen.add(record.id);
    actions.push({ id: record.id, trackerId: record.trackerId, direction: record.direction, at });
  }
  return actions;
}

export function parseIds(raw: unknown): string[] {
  const value = parseJson(raw);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Producer side (widget / watch handler): add one press, forgetting presses the app has already applied.
 * Returns the JSON to store. Swift implements the same steps.
 */
export function appendAction(inboxRaw: unknown, appliedIds: readonly string[], action: WidgetAction): string {
  const acked = new Set(appliedIds);
  const kept = parseActions(inboxRaw).filter((item) => !acked.has(item.id) && item.id !== action.id);
  kept.push(action);
  return JSON.stringify(kept.slice(-INBOX_LIMIT));
}

/** Consumer side: only presses this device has never applied. Oldest first. */
export function freshActions(actions: readonly WidgetAction[], applied: ReadonlySet<string>, now: number): WidgetAction[] {
  return actions
    .filter((action) => !applied.has(action.id))
    .map((action) => (action.at > now + FUTURE_SKEW_MS ? { ...action, at: now } : action))
    .sort((a, b) => a.at - b.at);
}

/** Presses still waiting (not yet applied), used to keep widgets accurate between app launches. */
export function pendingFor(actions: readonly WidgetAction[], applied: ReadonlySet<string>): WidgetAction[] {
  return actions.filter((action) => !applied.has(action.id));
}

export function trimLedger(ids: readonly string[]): string[] {
  return ids.slice(-LEDGER_LIMIT);
}

export type InboxBridge = {
  readInbox(): Promise<unknown>;
  /** Called after presses are safely recorded, so a source that owns its own queue (the Watch module) can drop them. */
  afterApply?(ids: string[]): Promise<void>;
};

export type LedgerStorage = {
  read(): Promise<string[]>;
  write(ids: string[]): Promise<void>;
};

/**
 * Apply everything waiting in the inbox exactly once.
 *
 * Order matters for crash safety: presses are applied in memory, the ledger is persisted,
 * and only then do sources drop them. A crash before the ledger write means the presses
 * are applied again next time only if the in-memory store was also lost, which is correct;
 * a crash after it can never double-apply.
 */
export async function drainInbox(input: {
  bridge: InboxBridge;
  ledger: LedgerStorage;
  apply: (actions: WidgetAction[]) => number;
  now: number;
}): Promise<{ applied: number; seen: number; ledger: string[] }> {
  const actions = parseActions(await input.bridge.readInbox());
  if (actions.length === 0) {
    return { applied: 0, seen: 0, ledger: await input.ledger.read() };
  }
  const ledger = await input.ledger.read();
  const applied = new Set(ledger);
  const fresh = freshActions(actions, applied, input.now);
  const count = fresh.length > 0 ? input.apply(fresh) : 0;
  const nextLedger = trimLedger([...ledger, ...fresh.map((action) => action.id)]);
  if (fresh.length > 0) {
    await input.ledger.write(nextLedger);
  }
  await input.bridge.afterApply?.(actions.map((action) => action.id).filter((id) => nextLedger.includes(id)));
  return { applied: count, seen: actions.length, ledger: nextLedger };
}
