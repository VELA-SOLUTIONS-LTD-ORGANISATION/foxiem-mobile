export const TRACKER_INTENTS = ['count', 'reach', 'limit', 'reduce', 'consistency'] as const;
export type TrackerIntent = (typeof TRACKER_INTENTS)[number];

/** `all` means the value never resets automatically (running total). */
export const TRACKER_PERIODS = ['day', 'week', 'month', 'all'] as const;
export type TrackerPeriod = (typeof TRACKER_PERIODS)[number];

export const TRACKER_COLORS = [
  'fox',
  'honey',
  'leaf',
  'teal',
  'sky',
  'iris',
  'berry',
  'cocoa',
  'slate',
] as const;
export type TrackerColor = (typeof TRACKER_COLORS)[number];

/** Same numbering as `Date#getDay()`: 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

export type TrackerOrigin = 'custom' | 'template' | 'migrated';

export type Tracker = {
  id: string;
  name: string;
  icon: string;
  color: TrackerColor;
  intent: TrackerIntent;
  period: TrackerPeriod;
  /**
   * reach: target per period · limit: maximum per period ·
   * reduce: optional goal ceiling per period · consistency: days per week (1–7).
   */
  target: number | null;
  /** reduce: the user's usual amount per period when they started (optional). */
  baseline: number | null;
  unit: string | null;
  step: number;
  /** Value before the first event of a running (`all`) tracker. */
  startingValue: number;
  notes: string;
  sortIndex: number;
  archivedAt: string | null;
  origin: TrackerOrigin;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CountEventType = 'increment' | 'decrement' | 'reset' | 'adjust';
export type CountEventSource = 'tap' | 'entry' | 'migration';

/**
 * Events are the source of truth. Arrays are kept oldest → newest.
 * `amount` is the signed change applied to the running value (0 for reset).
 * `previousValue` / `newValue` describe the running value around the event and
 * are recomputed whenever history is edited.
 */
export type CountEvent = {
  id: string;
  trackerId: string;
  type: CountEventType;
  amount: number;
  previousValue: number;
  newValue: number;
  createdAt: string;
  note?: string;
  source?: CountEventSource;
  editedAt?: string;
};

export type EventsByTracker = Record<string, CountEvent[]>;

export type TrackerDraft = {
  name: string;
  icon: string;
  color: TrackerColor;
  intent: TrackerIntent;
  period: TrackerPeriod;
  target: number | null;
  baseline: number | null;
  unit: string | null;
  step: number;
  startingValue: number;
  notes: string;
  templateId?: string | null;
};

export const TRACKER_LIMITS = {
  nameMaxLength: 40,
  unitMaxLength: 16,
  notesMaxLength: 500,
  eventNoteMaxLength: 200,
  targetMax: 1_000_000,
  stepMax: 1_000,
  startingValueMax: 10_000_000,
  entryAmountMax: 100_000,
  activeTrackersMax: 100,
} as const;

/** Consecutive taps closer than this merge into one history entry. */
export const TAP_COALESCE_WINDOW_MS = 4_000;

export const INTENT_PERIODS: Record<TrackerIntent, readonly TrackerPeriod[]> = {
  count: ['all', 'day', 'week', 'month'],
  reach: ['day', 'week', 'month', 'all'],
  limit: ['day', 'week', 'month'],
  reduce: ['day', 'week', 'month'],
  consistency: ['week'],
};

export function isTrackerIntent(value: unknown): value is TrackerIntent {
  return typeof value === 'string' && (TRACKER_INTENTS as readonly string[]).includes(value);
}

export function isTrackerPeriod(value: unknown): value is TrackerPeriod {
  return typeof value === 'string' && (TRACKER_PERIODS as readonly string[]).includes(value);
}

export function isTrackerColor(value: unknown): value is TrackerColor {
  return typeof value === 'string' && (TRACKER_COLORS as readonly string[]).includes(value);
}

export function isActivityEvent(event: CountEvent): boolean {
  return event.type === 'increment' || event.type === 'decrement';
}

export function requiresTarget(intent: TrackerIntent): boolean {
  return intent === 'reach' || intent === 'limit' || intent === 'consistency';
}
