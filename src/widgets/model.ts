import type { TrackerIntent, TrackerPeriod } from '@/domain/types';

/**
 * The contract between the app and everything that lives outside its JS runtime:
 * iOS/Android widgets, Lock Screen widgets and the Apple Watch.
 *
 * The app store is the single writer of tracker data. Outside surfaces
 *  - READ a display snapshot the app publishes, and
 *  - WRITE taps to an "inbox" the app drains whenever it is foregrounded.
 * Each tap carries a unique id, so applying it twice is impossible (see `inbox.ts`).
 */

/** Must match `com.apple.security.application-groups` in app.json and the Swift targets. */
export const APP_GROUP = 'group.co.uk.solutionvela.foxiem';

/** Keys inside the App Group defaults (iOS) or AsyncStorage (Android). Swift mirrors these strings. */
export const WIDGET_KEYS = {
  snapshot: 'foxiem.widget.snapshot',
  inbox: 'foxiem.widget.inbox',
  /** Android: which tracker each Pro counter widget shows, keyed by widget id. */
  config: 'foxiem.widget.config',
} as const;

export const URL_SCHEME = 'foxiem';

export const SNAPSHOT_VERSION = 1;

/** The most trackers any surface ever needs; keeps the snapshot small and the Watch list short. */
export const WIDGET_MAX_TRACKERS = 12;

/** How many applied ids travel in the snapshot; covers the inbox limit with room to spare. */
export const APPLIED_IN_SNAPSHOT = 200;

export type WidgetTone = {
  solid: string;
  soft: string;
  ink: string;
  onSolid: string;
};

export type WidgetTracker = {
  id: string;
  name: string;
  /** SF Symbol name for SwiftUI surfaces. */
  symbol: string;
  /** MaterialCommunityIcons name for Android surfaces. */
  glyph: string;
  intent: TrackerIntent;
  period: TrackerPeriod;
  light: WidgetTone;
  dark: WidgetTone;
  /** Headline number at `generatedAt` (active days for consistency trackers). */
  value: number;
  /** Goal, ceiling or days per week; null when the tracker has none. */
  target: number | null;
  /** How much one + or − press changes the value. */
  step: number;
  /** Small label beside the number: "of 8", "max 3", "this week", "total", a unit. */
  caption: string;
  /** Epoch ms when the current period resets; null for running totals. */
  periodEnd: number | null;
  /** Consistency trackers: how many entries today (a first tap of the day adds one active day). */
  today: number;
  /** Whether a − press can do anything right now. */
  canDecrement: boolean;
};

export type WidgetLabels = {
  goalReached: string;
  overLimit: string;
  atLimit: string;
  empty: string;
  locked: string;
  lockedBody: string;
  open: string;
};

export type WidgetSnapshot = {
  v: typeof SNAPSHOT_VERSION;
  generatedAt: number;
  isPro: boolean;
  /**
   * Epoch ms after which `isPro` no longer holds (a subscription that lapses while the app stays closed);
   * null when Pro does not expire. Surfaces apply `settleSnapshot` so they downgrade without the app.
   */
  proUntil: number | null;
  language: string;
  /** The tracker Free widgets (and unconfigured Pro widgets) show. */
  primaryId: string | null;
  /**
   * Ids of presses the app has already applied (most recent last). Surfaces drop those from their own
   * pending list, so a value is never counted twice and an inbox never needs a separate acknowledgement.
   */
  applied: string[];
  labels: WidgetLabels;
  trackers: WidgetTracker[];
};

export type WidgetDirection = 'up' | 'down';

/** One press recorded outside the app, waiting to be applied to the real history. */
export type WidgetAction = {
  /** Globally unique; the app never applies an id twice. */
  id: string;
  trackerId: string;
  direction: WidgetDirection;
  /** Epoch ms of the press. */
  at: number;
};

export type WidgetKind = 'FoxiemCounter' | 'FoxiemTrackers';
