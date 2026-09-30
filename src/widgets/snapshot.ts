import { trackerSnapshot } from '@/domain/analysis';
import { periodRange } from '@/domain/periods';
import { orderTrackers } from '@/domain/trackers';
import type { CountEvent, EventsByTracker, Tracker, WeekStart } from '@/domain/types';
import { numberCaption } from '@/format/trackerCopy';
import { trackerTone } from '@/theme/palette';

import { sfSymbolFor } from './icons';
import {
  APPLIED_IN_SNAPSHOT,
  SNAPSHOT_VERSION,
  WIDGET_MAX_TRACKERS,
  type WidgetAction,
  type WidgetLabels,
  type WidgetSnapshot,
  type WidgetTracker,
} from './model';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function widgetLabels(t: Translate): WidgetLabels {
  return {
    goalReached: t('widget.goalReached'),
    overLimit: t('widget.overLimit'),
    atLimit: t('widget.atLimit'),
    empty: t('widget.empty'),
    locked: t('widget.locked'),
    lockedBody: t('widget.lockedBody'),
    open: t('widget.open'),
  };
}

/** The tracker Free widgets show: the person's choice while it is still active, otherwise the first one. */
export function resolvePrimaryId(active: readonly Tracker[], chosen: string | null): string | null {
  if (chosen && active.some((tracker) => tracker.id === chosen)) {
    return chosen;
  }
  return active[0]?.id ?? null;
}

export function buildWidgetTracker(
  tracker: Tracker,
  events: readonly CountEvent[],
  input: { now: Date; weekStart: WeekStart; t: Translate; locale: string },
): WidgetTracker {
  const snapshot = trackerSnapshot(tracker, events, { now: input.now, weekStart: input.weekStart });
  const range = tracker.period === 'all' ? null : periodRange(tracker.period, input.now, input.weekStart);
  const consistency = tracker.intent === 'consistency';
  return {
    id: tracker.id,
    name: tracker.name,
    symbol: sfSymbolFor(tracker.icon),
    glyph: tracker.icon,
    intent: tracker.intent,
    period: tracker.period,
    light: trackerTone(tracker.color, 'light'),
    dark: trackerTone(tracker.color, 'dark'),
    value: snapshot.hero,
    target: tracker.intent === 'count' || tracker.intent === 'reduce' ? null : tracker.target ?? (consistency ? 7 : null),
    step: tracker.step,
    caption: numberCaption(tracker, input.t as never, input.locale),
    periodEnd: range ? range.end.getTime() : null,
    today: snapshot.today,
    canDecrement: consistency ? snapshot.today > 0 : snapshot.periodValue > 0,
  };
}

export function buildWidgetSnapshot(input: {
  trackers: readonly Tracker[];
  events: EventsByTracker;
  now: Date;
  weekStart: WeekStart;
  isPro: boolean;
  /** `proAccessUntil(entitlement)`; null when Pro does not lapse on its own. */
  proUntil: number | null;
  language: string;
  chosenTrackerId: string | null;
  /** Ledger of external presses already applied to the histories this snapshot was built from. */
  applied: readonly string[];
  t: Translate;
}): WidgetSnapshot {
  const active = orderTrackers(input.trackers.filter((tracker) => tracker.archivedAt === null));
  const primaryId = resolvePrimaryId(active, input.chosenTrackerId);
  // The primary tracker always travels; the rest follow in the app's own order.
  const ordered = [...active].sort((a, b) => Number(b.id === primaryId) - Number(a.id === primaryId));
  const shown = ordered.slice(0, input.isPro ? WIDGET_MAX_TRACKERS : 1);
  return {
    v: SNAPSHOT_VERSION,
    generatedAt: input.now.getTime(),
    isPro: input.isPro,
    proUntil: input.isPro ? input.proUntil : null,
    language: input.language,
    primaryId,
    applied: (input.applied ?? []).slice(-APPLIED_IN_SNAPSHOT),
    labels: widgetLabels(input.t),
    trackers: shown.map((tracker) =>
      buildWidgetTracker(tracker, input.events[tracker.id] ?? [], {
        now: input.now,
        weekStart: input.weekStart,
        t: input.t,
        locale: input.language,
      }),
    ),
  };
}

/**
 * A snapshot as it should be read at `now`. If the Pro entitlement it was published under has since
 * lapsed (the app has been closed), the surface behaves as Free: not Pro, and only the primary tracker.
 * Mirrored by `Snapshot.settled(now:)` in the Swift targets.
 */
export function settleSnapshot(snapshot: WidgetSnapshot, now: number): WidgetSnapshot {
  if (!snapshot.isPro || snapshot.proUntil === null || snapshot.proUntil === undefined || now <= snapshot.proUntil) {
    return snapshot;
  }
  const primary = snapshot.trackers.find((tracker) => tracker.id === snapshot.primaryId) ?? snapshot.trackers[0];
  return { ...snapshot, isPro: false, trackers: primary ? [primary] : [] };
}

export type WidgetDisplayState = 'neutral' | 'reached' | 'atLimit' | 'over';

export type WidgetDisplay = {
  value: number;
  progress: number | null;
  state: WidgetDisplayState;
  /** Presses accounted for on top of the snapshot. */
  pending: number;
};

/**
 * What a widget should show right now: the snapshot plus presses made since it was published.
 * The Swift and Kotlin/JS renderers mirror exactly this logic so a tap looks instant everywhere.
 */
export function resolveDisplay(tracker: WidgetTracker, actions: readonly WidgetAction[], now: number): WidgetDisplay {
  // A period that rolled over since the snapshot starts again from zero; only later presses count.
  const rolled = tracker.periodEnd !== null && now >= tracker.periodEnd;
  const relevant = actions
    .filter((action) => action.trackerId === tracker.id && (!rolled || action.at >= (tracker.periodEnd ?? 0)))
    .sort((a, b) => a.at - b.at);

  let value = rolled ? 0 : tracker.value;
  let today = rolled ? 0 : tracker.today;
  let pending = 0;
  for (const action of relevant) {
    pending += 1;
    if (tracker.intent === 'consistency') {
      if (action.direction === 'up') {
        if (today === 0) {
          value += 1;
        }
        today += 1;
      } else if (today > 0) {
        today -= 1;
        if (today === 0) {
          value = Math.max(0, value - 1);
        }
      }
    } else if (action.direction === 'up') {
      value += tracker.step;
    } else {
      value = Math.max(0, value - Math.min(tracker.step, value));
    }
  }

  const target = tracker.target;
  let progress: number | null = null;
  let state: WidgetDisplayState = 'neutral';
  if (target !== null && target > 0) {
    progress = Math.min(1, value / target);
    if (tracker.intent === 'reach' || tracker.intent === 'consistency') {
      state = value >= target ? 'reached' : 'neutral';
    } else if (tracker.intent === 'limit') {
      state = value > target ? 'over' : value === target ? 'atLimit' : 'neutral';
    }
  }
  return { value, progress, state, pending };
}
