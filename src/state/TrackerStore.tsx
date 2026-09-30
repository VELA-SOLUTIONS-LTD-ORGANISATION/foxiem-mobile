import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
  addEntry as addEntryPure,
  applyDraft,
  applyTap,
  createTracker as createTrackerPure,
  deleteEntry as deleteEntryPure,
  moveTracker as moveTrackerPure,
  nextSortIndex,
  orderTrackers,
  rebuildChain,
  resetRunningValue,
  revertTaps,
  updateEntry as updateEntryPure,
  validateDraft,
  type CountEvent,
  type EntryPatch,
  type EventsByTracker,
  type TapBurst,
  type TapDirection,
  type Tracker,
  type TrackerDraft,
  type TrackerDraftError,
  type TrackerOrigin,
} from '@/domain';
import { i18n } from '@/i18n';
import { trackEvent } from '@/lib/telemetry/analytics';
import {
  createKeyedWriter,
  loadDomain,
  markFirstRunCompleted,
  removeTrackerEvents,
  saveTrackerEvents,
  saveTrackers,
  type LoadSource,
} from '@/storage';

import { usePreferences } from './PreferencesProvider';

export type TapReceipt = {
  trackerId: string;
  eventId: string;
  delta: number;
  merged: boolean;
};

/** A press made on a widget or the Watch, stamped when it happened. */
export type ExternalTap = { id: string; trackerId: string; direction: TapDirection; at: number };

export type DraftResult = { tracker: Tracker; error: null } | { tracker: null; error: TrackerDraftError };

type Snapshot = {
  trackers: Tracker[];
  events: EventsByTracker;
};

type TrackerStoreValue = {
  hydrated: boolean;
  loadSource: LoadSource;
  unreadableTrackerIds: string[];
  firstRunCompleted: boolean;
  saveFailed: boolean;
  trackers: Tracker[];
  events: EventsByTracker;
  createTracker: (draft: TrackerDraft, origin?: TrackerOrigin) => DraftResult;
  updateTracker: (trackerId: string, draft: TrackerDraft) => DraftResult;
  archiveTracker: (trackerId: string) => void;
  restoreTracker: (trackerId: string) => void;
  deleteTracker: (trackerId: string) => void;
  moveTracker: (trackerId: string, direction: -1 | 1) => void;
  tap: (trackerId: string, direction: TapDirection, amount?: number) => TapReceipt | null;
  undo: (receipt: TapReceipt) => boolean;
  /**
   * Apply presses recorded outside the app (widgets, Apple Watch) with the time they were made.
   * Returns how many changed a tracker; presses for archived or deleted trackers are skipped.
   */
  applyExternalTaps: (actions: readonly ExternalTap[]) => number;
  addEntry: (trackerId: string, input: { amount: number; at: Date; note?: string }) => boolean;
  updateEntry: (trackerId: string, eventId: string, patch: EntryPatch) => boolean;
  deleteEntry: (trackerId: string, eventId: string) => CountEvent | null;
  restoreEntry: (trackerId: string, event: CountEvent) => void;
  resetTracker: (trackerId: string) => boolean;
  /** Add complete trackers with history (sample data today; restore from backup later). */
  importTrackers: (items: readonly { tracker: Tracker; events: CountEvent[] }[]) => void;
  completeFirstRun: () => Promise<void>;
  clearAll: () => void;
  flush: () => Promise<void>;
};

const TrackerStoreContext = createContext<TrackerStoreValue | null>(null);

const TRACKERS_KEY = '__trackers__';

function findIn(snapshot: Snapshot, trackerId: string): Tracker | undefined {
  return snapshot.trackers.find((tracker) => tracker.id === trackerId);
}

export function TrackerStoreProvider({ children }: { children: ReactNode }) {
  const { weekStart } = usePreferences();
  const [hydrated, setHydrated] = useState(false);
  const [loadSource, setLoadSource] = useState<LoadSource>('fresh');
  const [unreadableTrackerIds, setUnreadable] = useState<string[]>([]);
  const [firstRunCompleted, setFirstRunCompleted] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [state, setState] = useState<Snapshot>({ trackers: [], events: {} });
  const latest = useRef<Snapshot>(state);
  const burst = useRef<TapBurst | null>(null);
  const weekStartRef = useRef(weekStart);
  const everIncremented = useRef(false);

  useEffect(() => {
    weekStartRef.current = weekStart;
  }, [weekStart]);

  const writer = useMemo(
    () =>
      createKeyedWriter<unknown>(
        async (key, snapshot) => {
          if (key === TRACKERS_KEY) {
            await saveTrackers(snapshot as Tracker[]);
          } else if (snapshot === null) {
            await removeTrackerEvents(key);
          } else {
            await saveTrackerEvents(key, snapshot as CountEvent[]);
          }
          setSaveFailed(false);
        },
        (error) => {
          setSaveFailed(true);
          if (__DEV__) {
            console.warn('Foxiem could not save', error);
          }
        },
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await loadDomain({ defaultTrackerName: i18n.t('trackers.defaultName') });
        if (cancelled) {
          return;
        }
        const next = { trackers: orderTrackers(loaded.trackers), events: loaded.events };
        latest.current = next;
        everIncremented.current = Object.values(loaded.events).some((events) =>
          events.some((event) => event.type === 'increment'),
        );
        setState(next);
        setLoadSource(loaded.source);
        setUnreadable(loaded.unreadableTrackerIds);
        setFirstRunCompleted(loaded.firstRunCompleted);
        // Migrated data that could not be written yet is shown from memory; the writer keeps retrying.
        setSaveFailed(!loaded.persisted);
      } catch (error) {
        if (__DEV__) {
          console.warn('Foxiem could not load data', error);
        }
        setLoadSource('unreadable');
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        void writer.flush();
      }
    });
    return () => subscription.remove();
  }, [writer]);

  const commit = useCallback(
    (next: Snapshot, changed: { trackers?: boolean; eventIds?: string[]; removedIds?: string[] }) => {
      latest.current = next;
      setState(next);
      if (changed.trackers) {
        writer.enqueue(TRACKERS_KEY, next.trackers);
      }
      for (const trackerId of changed.eventIds ?? []) {
        writer.enqueue(trackerId, next.events[trackerId] ?? []);
      }
      for (const trackerId of changed.removedIds ?? []) {
        writer.enqueue(trackerId, null);
      }
    },
    [writer],
  );

  const setEvents = useCallback(
    (trackerId: string, events: CountEvent[]) => {
      commit(
        { trackers: latest.current.trackers, events: { ...latest.current.events, [trackerId]: events } },
        { eventIds: [trackerId] },
      );
    },
    [commit],
  );

  const createTracker = useCallback(
    (draft: TrackerDraft, origin?: TrackerOrigin): DraftResult => {
      const error = validateDraft(draft, latest.current.trackers);
      if (error) {
        return { tracker: null, error };
      }
      const tracker = createTrackerPure(draft, latest.current.trackers, { origin });
      commit(
        {
          trackers: orderTrackers([...latest.current.trackers, tracker]),
          events: { ...latest.current.events, [tracker.id]: [] },
        },
        { trackers: true, eventIds: [tracker.id] },
      );
      void trackEvent('tracker_created', {
        intent: tracker.intent,
        source: tracker.origin === 'template' ? 'template' : 'custom',
      });
      return { tracker, error: null };
    },
    [commit],
  );

  const updateTracker = useCallback(
    (trackerId: string, draft: TrackerDraft): DraftResult => {
      const current = findIn(latest.current, trackerId);
      if (!current) {
        return { tracker: null, error: 'nameRequired' };
      }
      const error = validateDraft(draft, latest.current.trackers, { editingId: trackerId });
      if (error) {
        return { tracker: null, error };
      }
      const tracker = applyDraft(current, draft);
      const startingChanged = tracker.startingValue !== current.startingValue;
      const events = latest.current.events[trackerId] ?? [];
      commit(
        {
          trackers: latest.current.trackers.map((item) => (item.id === trackerId ? tracker : item)),
          events: {
            ...latest.current.events,
            [trackerId]: startingChanged ? rebuildChain(tracker.startingValue, events) : events,
          },
        },
        { trackers: true, eventIds: startingChanged ? [trackerId] : [] },
      );
      return { tracker, error: null };
    },
    [commit],
  );

  const archiveTracker = useCallback(
    (trackerId: string) => {
      const now = new Date().toISOString();
      commit(
        {
          trackers: latest.current.trackers.map((tracker) =>
            tracker.id === trackerId ? { ...tracker, archivedAt: now, updatedAt: now } : tracker,
          ),
          events: latest.current.events,
        },
        { trackers: true },
      );
    },
    [commit],
  );

  const restoreTracker = useCallback(
    (trackerId: string) => {
      const now = new Date().toISOString();
      const active = latest.current.trackers.filter((tracker) => tracker.archivedAt === null);
      commit(
        {
          trackers: orderTrackers(
            latest.current.trackers.map((tracker) =>
              tracker.id === trackerId
                ? { ...tracker, archivedAt: null, sortIndex: nextSortIndex(active), updatedAt: now }
                : tracker,
            ),
          ),
          events: latest.current.events,
        },
        { trackers: true },
      );
    },
    [commit],
  );

  const deleteTracker = useCallback(
    (trackerId: string) => {
      const events = { ...latest.current.events };
      delete events[trackerId];
      commit(
        { trackers: latest.current.trackers.filter((tracker) => tracker.id !== trackerId), events },
        { trackers: true, removedIds: [trackerId] },
      );
    },
    [commit],
  );

  const moveTracker = useCallback(
    (trackerId: string, direction: -1 | 1) => {
      commit(
        {
          trackers: orderTrackers(moveTrackerPure(latest.current.trackers, trackerId, direction)),
          events: latest.current.events,
        },
        { trackers: true },
      );
    },
    [commit],
  );

  const tap = useCallback(
    (trackerId: string, direction: TapDirection, amount?: number): TapReceipt | null => {
      const tracker = findIn(latest.current, trackerId);
      if (!tracker) {
        return null;
      }
      const result = applyTap(tracker, latest.current.events[trackerId] ?? [], {
        direction,
        amount,
        now: new Date(),
        weekStart: weekStartRef.current,
        burst: amount === undefined ? burst.current : null,
      });
      if (!result) {
        return null;
      }
      burst.current = amount === undefined ? result.burst : null;
      setEvents(trackerId, result.events);
      if (direction === 'up' && !everIncremented.current) {
        everIncremented.current = true;
        void trackEvent('first_count');
      }
      return { trackerId, eventId: result.event.id, delta: result.delta, merged: result.merged };
    },
    [setEvents],
  );

  const applyExternalTaps = useCallback(
    (actions: readonly ExternalTap[]): number => {
      if (actions.length === 0) {
        return 0;
      }
      const bursts = new Map<string, TapBurst>();
      const events = { ...latest.current.events };
      const changed = new Set<string>();
      const now = Date.now();
      let applied = 0;
      for (const action of [...actions].sort((a, b) => a.at - b.at)) {
        const tracker = findIn(latest.current, action.trackerId);
        if (!tracker || tracker.archivedAt !== null) {
          continue;
        }
        const result = applyTap(tracker, events[tracker.id] ?? [], {
          direction: action.direction,
          now: new Date(Math.min(action.at, now)),
          weekStart: weekStartRef.current,
          // Presses in one burst merge into one history entry, exactly as taps in the app do.
          burst: bursts.get(tracker.id) ?? null,
          id: action.id,
        });
        if (!result) {
          continue;
        }
        bursts.set(tracker.id, result.burst);
        events[tracker.id] = result.events;
        changed.add(tracker.id);
        applied += 1;
      }
      if (applied > 0) {
        burst.current = null;
        commit({ trackers: latest.current.trackers, events }, { eventIds: [...changed] });
      }
      return applied;
    },
    [commit],
  );

  const undo = useCallback(
    (receipt: TapReceipt): boolean => {
      const tracker = findIn(latest.current, receipt.trackerId);
      if (!tracker) {
        return false;
      }
      const next = revertTaps(tracker, latest.current.events[receipt.trackerId] ?? [], receipt.eventId, receipt.delta);
      if (!next) {
        return false;
      }
      burst.current = null;
      setEvents(receipt.trackerId, next);
      return true;
    },
    [setEvents],
  );

  const addEntry = useCallback(
    (trackerId: string, input: { amount: number; at: Date; note?: string }) => {
      const tracker = findIn(latest.current, trackerId);
      const next = tracker ? addEntryPure(tracker, latest.current.events[trackerId] ?? [], input) : null;
      if (!next) {
        return false;
      }
      burst.current = null;
      setEvents(trackerId, next);
      return true;
    },
    [setEvents],
  );

  const updateEntry = useCallback(
    (trackerId: string, eventId: string, patch: EntryPatch) => {
      const tracker = findIn(latest.current, trackerId);
      const next = tracker ? updateEntryPure(tracker, latest.current.events[trackerId] ?? [], eventId, patch) : null;
      if (!next) {
        return false;
      }
      burst.current = null;
      setEvents(trackerId, next);
      return true;
    },
    [setEvents],
  );

  const deleteEntry = useCallback(
    (trackerId: string, eventId: string): CountEvent | null => {
      const tracker = findIn(latest.current, trackerId);
      const events = latest.current.events[trackerId] ?? [];
      const removed = events.find((event) => event.id === eventId) ?? null;
      const next = tracker ? deleteEntryPure(tracker, events, eventId) : null;
      if (!next || !removed) {
        return null;
      }
      burst.current = null;
      setEvents(trackerId, next);
      return removed;
    },
    [setEvents],
  );

  const restoreEntry = useCallback(
    (trackerId: string, event: CountEvent) => {
      const tracker = findIn(latest.current, trackerId);
      if (!tracker) {
        return;
      }
      const events = latest.current.events[trackerId] ?? [];
      if (events.some((item) => item.id === event.id)) {
        return;
      }
      setEvents(trackerId, rebuildChain(tracker.startingValue, [...events, event]));
    },
    [setEvents],
  );

  const resetTracker = useCallback(
    (trackerId: string) => {
      const tracker = findIn(latest.current, trackerId);
      const next = tracker ? resetRunningValue(tracker, latest.current.events[trackerId] ?? [], new Date()) : null;
      if (!next) {
        return false;
      }
      burst.current = null;
      setEvents(trackerId, next);
      return true;
    },
    [setEvents],
  );

  const importTrackers = useCallback(
    (items: readonly { tracker: Tracker; events: CountEvent[] }[]) => {
      const known = new Set(latest.current.trackers.map((tracker) => tracker.id));
      const fresh = items.filter((item) => !known.has(item.tracker.id));
      if (fresh.length === 0) {
        return;
      }
      const events = { ...latest.current.events };
      for (const item of fresh) {
        events[item.tracker.id] = rebuildChain(item.tracker.startingValue, item.events);
      }
      commit(
        { trackers: orderTrackers([...latest.current.trackers, ...fresh.map((item) => item.tracker)]), events },
        { trackers: true, eventIds: fresh.map((item) => item.tracker.id) },
      );
    },
    [commit],
  );

  const completeFirstRun = useCallback(async () => {
    setFirstRunCompleted(true);
    await markFirstRunCompleted();
    void trackEvent('onboarding_complete');
  }, []);

  const clearAll = useCallback(() => {
    const empty = { trackers: [], events: {} };
    latest.current = empty;
    burst.current = null;
    everIncremented.current = false;
    setState(empty);
    setFirstRunCompleted(false);
    setLoadSource('fresh');
    setUnreadable([]);
  }, []);

  const value = useMemo<TrackerStoreValue>(
    () => ({
      hydrated,
      loadSource,
      unreadableTrackerIds,
      firstRunCompleted,
      saveFailed,
      trackers: state.trackers,
      events: state.events,
      createTracker,
      updateTracker,
      archiveTracker,
      restoreTracker,
      deleteTracker,
      moveTracker,
      tap,
      undo,
      applyExternalTaps,
      addEntry,
      updateEntry,
      deleteEntry,
      restoreEntry,
      resetTracker,
      importTrackers,
      completeFirstRun,
      clearAll,
      flush: writer.flush,
    }),
    [
      hydrated,
      loadSource,
      unreadableTrackerIds,
      firstRunCompleted,
      saveFailed,
      state,
      createTracker,
      updateTracker,
      archiveTracker,
      restoreTracker,
      deleteTracker,
      moveTracker,
      tap,
      undo,
      applyExternalTaps,
      addEntry,
      updateEntry,
      deleteEntry,
      restoreEntry,
      resetTracker,
      importTrackers,
      completeFirstRun,
      clearAll,
      writer,
    ],
  );

  return <TrackerStoreContext.Provider value={value}>{children}</TrackerStoreContext.Provider>;
}

export function useTrackerStore(): TrackerStoreValue {
  const context = useContext(TrackerStoreContext);
  if (!context) {
    throw new Error('useTrackerStore must be used within TrackerStoreProvider');
  }
  return context;
}

export function useTracker(trackerId: string): { tracker: Tracker | null; events: CountEvent[] } {
  const { trackers, events } = useTrackerStore();
  const tracker = trackers.find((item) => item.id === trackerId) ?? null;
  return { tracker, events: events[trackerId] ?? EMPTY_EVENTS };
}

const EMPTY_EVENTS: CountEvent[] = [];
