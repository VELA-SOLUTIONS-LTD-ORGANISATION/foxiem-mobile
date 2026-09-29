import { createLocalId } from '@/utils/id';

import {
  INTENT_PERIODS,
  TRACKER_COLORS,
  TRACKER_LIMITS,
  requiresTarget,
  type Tracker,
  type TrackerColor,
  type TrackerDraft,
  type TrackerIntent,
  type TrackerOrigin,
  type TrackerPeriod,
} from './types';

export const DEFAULT_TRACKER_ICON = 'tally-mark-5';

export type TrackerDraftError =
  | 'nameRequired'
  | 'nameTooLong'
  | 'nameDuplicate'
  | 'targetRequired'
  | 'targetRange'
  | 'stepRange'
  | 'startingValueRange'
  | 'unitTooLong'
  | 'baselineRange'
  | 'trackerLimit';

export function normalizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().normalize('NFC');
}

export function nameKey(value: string): string {
  return normalizeName(value).toLocaleLowerCase();
}

function cleanInteger(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Math.floor(value);
}

export function defaultPeriodFor(intent: TrackerIntent): TrackerPeriod {
  if (intent === 'count') {
    return 'all';
  }
  if (intent === 'reduce' || intent === 'consistency') {
    return 'week';
  }
  return 'day';
}

export function defaultTargetFor(intent: TrackerIntent): number | null {
  switch (intent) {
    case 'reach':
      return 10;
    case 'limit':
      return 3;
    case 'consistency':
      return 7;
    default:
      return null;
  }
}

/** Keep intent, period and target coherent when the intent changes. */
export function coerceDraftForIntent(draft: TrackerDraft, intent: TrackerIntent): TrackerDraft {
  const periods = INTENT_PERIODS[intent];
  const period = periods.includes(draft.period) ? draft.period : defaultPeriodFor(intent);
  let target = draft.target;
  if (intent === 'consistency') {
    target = target && target >= 1 && target <= 7 ? target : 7;
  } else if (requiresTarget(intent)) {
    target = target && target > 0 ? target : defaultTargetFor(intent);
  } else if (intent === 'count') {
    target = null;
  }
  return {
    ...draft,
    intent,
    period,
    target,
    baseline: intent === 'reduce' ? draft.baseline : null,
  };
}

export function emptyDraft(overrides: Partial<TrackerDraft> = {}): TrackerDraft {
  return {
    name: '',
    icon: DEFAULT_TRACKER_ICON,
    color: 'fox',
    intent: 'count',
    period: 'all',
    target: null,
    baseline: null,
    unit: null,
    step: 1,
    startingValue: 0,
    notes: '',
    templateId: null,
    ...overrides,
  };
}

export function validateDraft(
  draft: TrackerDraft,
  trackers: readonly Tracker[],
  options: { editingId?: string } = {},
): TrackerDraftError | null {
  const name = normalizeName(draft.name);
  if (!name) {
    return 'nameRequired';
  }
  if (name.length > TRACKER_LIMITS.nameMaxLength) {
    return 'nameTooLong';
  }
  const key = nameKey(name);
  const duplicate = trackers.some(
    (tracker) =>
      tracker.id !== options.editingId && tracker.archivedAt === null && nameKey(tracker.name) === key,
  );
  if (duplicate) {
    return 'nameDuplicate';
  }
  if (
    !options.editingId &&
    trackers.filter((tracker) => tracker.archivedAt === null).length >= TRACKER_LIMITS.activeTrackersMax
  ) {
    return 'trackerLimit';
  }

  const target = cleanInteger(draft.target);
  if (requiresTarget(draft.intent) && target === null) {
    return 'targetRequired';
  }
  if (target !== null) {
    const max = draft.intent === 'consistency' ? 7 : TRACKER_LIMITS.targetMax;
    if (target < 1 || target > max) {
      return 'targetRange';
    }
  }

  const baseline = cleanInteger(draft.baseline);
  if (baseline !== null && (baseline < 0 || baseline > TRACKER_LIMITS.targetMax)) {
    return 'baselineRange';
  }

  const step = cleanInteger(draft.step);
  if (step === null || step < 1 || step > TRACKER_LIMITS.stepMax) {
    return 'stepRange';
  }

  const starting = cleanInteger(draft.startingValue) ?? 0;
  if (starting < 0 || starting > TRACKER_LIMITS.startingValueMax) {
    return 'startingValueRange';
  }

  if ((draft.unit?.trim().length ?? 0) > TRACKER_LIMITS.unitMaxLength) {
    return 'unitTooLong';
  }

  return null;
}

function cleanDraft(draft: TrackerDraft): TrackerDraft {
  const coerced = coerceDraftForIntent(draft, draft.intent);
  const unit = coerced.unit?.trim() ?? '';
  return {
    ...coerced,
    name: normalizeName(coerced.name),
    unit: unit ? unit.slice(0, TRACKER_LIMITS.unitMaxLength) : null,
    notes: coerced.notes.trim().slice(0, TRACKER_LIMITS.notesMaxLength),
    target: cleanInteger(coerced.target),
    baseline: cleanInteger(coerced.baseline),
    step: cleanInteger(coerced.step) ?? 1,
    startingValue: coerced.period === 'all' ? Math.max(0, cleanInteger(coerced.startingValue) ?? 0) : 0,
  };
}

export function nextSortIndex(trackers: readonly Tracker[]): number {
  return trackers.reduce((max, tracker) => Math.max(max, tracker.sortIndex), -1) + 1;
}

export function createTracker(
  draft: TrackerDraft,
  trackers: readonly Tracker[],
  options: { now?: Date; id?: string; origin?: TrackerOrigin } = {},
): Tracker {
  const clean = cleanDraft(draft);
  const now = (options.now ?? new Date()).toISOString();
  return {
    id: options.id ?? `tracker.${createLocalId()}`,
    name: clean.name,
    icon: clean.icon || DEFAULT_TRACKER_ICON,
    color: clean.color,
    intent: clean.intent,
    period: clean.period,
    target: clean.target,
    baseline: clean.baseline,
    unit: clean.unit,
    step: clean.step,
    startingValue: clean.startingValue,
    notes: clean.notes,
    sortIndex: nextSortIndex(trackers),
    archivedAt: null,
    origin: options.origin ?? (clean.templateId ? 'template' : 'custom'),
    templateId: clean.templateId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Apply edits. Changing intent or period never touches events: every number is re-derived
 * from history, so the change is reversible.
 */
export function applyDraft(tracker: Tracker, draft: TrackerDraft, now: Date = new Date()): Tracker {
  const clean = cleanDraft(draft);
  return {
    ...tracker,
    name: clean.name,
    icon: clean.icon || tracker.icon,
    color: clean.color,
    intent: clean.intent,
    period: clean.period,
    target: clean.target,
    baseline: clean.baseline,
    unit: clean.unit,
    step: clean.step,
    startingValue: clean.period === 'all' ? clean.startingValue : tracker.startingValue,
    notes: clean.notes,
    updatedAt: now.toISOString(),
  };
}

export function draftFromTracker(tracker: Tracker): TrackerDraft {
  return {
    name: tracker.name,
    icon: tracker.icon,
    color: tracker.color,
    intent: tracker.intent,
    period: tracker.period,
    target: tracker.target,
    baseline: tracker.baseline,
    unit: tracker.unit,
    step: tracker.step,
    startingValue: tracker.startingValue,
    notes: tracker.notes,
    templateId: tracker.templateId,
  };
}

export function orderTrackers(trackers: readonly Tracker[]): Tracker[] {
  return [...trackers].sort((left, right) => {
    if (left.sortIndex !== right.sortIndex) {
      return left.sortIndex - right.sortIndex;
    }
    const time = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return time !== 0 ? time : left.id.localeCompare(right.id);
  });
}

export function activeTrackers(trackers: readonly Tracker[]): Tracker[] {
  return orderTrackers(trackers.filter((tracker) => tracker.archivedAt === null));
}

export function archivedTrackers(trackers: readonly Tracker[]): Tracker[] {
  return orderTrackers(trackers.filter((tracker) => tracker.archivedAt !== null));
}

/** Move one active tracker up or down; returns trackers with dense sort indexes. */
export function moveTracker(
  trackers: readonly Tracker[],
  trackerId: string,
  direction: -1 | 1,
): Tracker[] {
  const active = activeTrackers(trackers);
  const index = active.findIndex((tracker) => tracker.id === trackerId);
  const swapWith = index + direction;
  if (index < 0 || swapWith < 0 || swapWith >= active.length) {
    return [...trackers];
  }
  const reordered = [...active];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(swapWith, 0, moved!);
  const indexById = new Map(reordered.map((tracker, position) => [tracker.id, position]));
  return trackers.map((tracker) => {
    const position = indexById.get(tracker.id);
    if (position === undefined || tracker.sortIndex === position) {
      return tracker;
    }
    return { ...tracker, sortIndex: position };
  });
}

export function pickColor(trackers: readonly Tracker[]): TrackerColor {
  const used = new Map<TrackerColor, number>();
  for (const tracker of trackers) {
    if (tracker.archivedAt === null) {
      used.set(tracker.color, (used.get(tracker.color) ?? 0) + 1);
    }
  }
  let best: TrackerColor = TRACKER_COLORS[0];
  let bestCount = Number.POSITIVE_INFINITY;
  for (const color of TRACKER_COLORS) {
    const count = used.get(color) ?? 0;
    if (count < bestCount) {
      best = color;
      bestCount = count;
    }
  }
  return best;
}
