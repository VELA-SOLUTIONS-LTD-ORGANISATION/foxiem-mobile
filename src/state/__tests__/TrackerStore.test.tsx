import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import { chainIsConsistent, runningValue } from '@/domain/events';
import { emptyDraft } from '@/domain/trackers';
import type { CountEvent } from '@/domain/types';
import { CountFeedbackProvider, useCountFeedback } from '@/state/CountFeedbackProvider';
import { PreferencesProvider } from '@/state/PreferencesProvider';
import { TrackerStoreProvider, useTrackerStore } from '@/state/TrackerStore';
import { eventsKey } from '@/storage/keys';

type Handles = {
  store: ReturnType<typeof useTrackerStore>;
  feedback: ReturnType<typeof useCountFeedback>;
};

const handles: { current: Handles | null } = { current: null };

function Probe() {
  const store = useTrackerStore();
  const feedback = useCountFeedback();
  useEffect(() => {
    handles.current = { store, feedback };
  });
  return null;
}

function current(): Handles {
  if (!handles.current) {
    throw new Error('providers are not mounted');
  }
  return handles.current;
}

async function mount() {
  const view = await render(
    <PreferencesProvider>
      <TrackerStoreProvider>
        <CountFeedbackProvider>
          <Probe />
        </CountFeedbackProvider>
      </TrackerStoreProvider>
    </PreferencesProvider>,
  );
  await waitFor(() => expect(current().store.hydrated).toBe(true));
  return view;
}

async function createCounter(name: string): Promise<string> {
  let id = '';
  await act(() => {
    id = current().store.createTracker(emptyDraft({ name })).tracker!.id;
  });
  return id;
}

function valueOf(trackerId: string): number {
  const { trackers, events } = current().store;
  const tracker = trackers.find((item) => item.id === trackerId)!;
  return runningValue(tracker, events[trackerId] ?? []);
}

function isConsistent(trackerId: string): boolean {
  const { trackers, events } = current().store;
  return chainIsConsistent(trackers.find((item) => item.id === trackerId)!, events[trackerId] ?? []);
}

beforeEach(async () => {
  handles.current = null;
  await AsyncStorage.clear();
});

describe('TrackerStore with real persistence', () => {
  it('never loses a tap in a rapid burst, and the count survives a restart', async () => {
    const view = await mount();
    const id = await createCounter('Rows');

    await act(() => {
      for (let tap = 0; tap < 60; tap += 1) {
        current().store.tap(id, 'up');
      }
    });
    expect(valueOf(id)).toBe(60);
    // A burst inside the coalescing window becomes one history entry, not 60.
    expect(current().store.events[id]).toHaveLength(1);

    await act(() => current().store.flush());
    const stored = JSON.parse((await AsyncStorage.getItem(eventsKey(id)))!) as CountEvent[];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ amount: 60, previousValue: 0, newValue: 60 });

    await view.unmount();
    handles.current = null;
    await mount();
    expect(valueOf(id)).toBe(60);
    expect(isConsistent(id)).toBe(true);
  });

  it('Undo reverts exactly the burst the user just saw', async () => {
    await mount();
    const id = await createCounter('Coffee');

    await act(() => {
      for (let tap = 0; tap < 3; tap += 1) {
        current().feedback.record(current().store.tap(id, 'up')!);
      }
    });
    expect(valueOf(id)).toBe(3);
    expect(current().feedback.pending?.delta).toBe(3);

    let undone = false;
    await act(() => {
      undone = current().feedback.undo();
    });
    expect(undone).toBe(true);
    expect(valueOf(id)).toBe(0);
    expect(current().store.events[id]).toHaveLength(0);
  });

  it('never goes below zero and keeps the chain consistent through edits', async () => {
    await mount();
    const id = await createCounter('Ideas');

    let blocked: unknown = 'not called';
    await act(() => {
      current().store.tap(id, 'up');
      current().store.tap(id, 'down');
      blocked = current().store.tap(id, 'down');
    });
    expect(blocked).toBeNull();
    expect(valueOf(id)).toBe(0);

    await act(() => {
      current().store.addEntry(id, { amount: 5, at: new Date(Date.now() - 3_600_000) });
    });
    const earliest = current().store.events[id]![0]!;
    let removed: CountEvent | null = null;
    await act(() => {
      removed = current().store.deleteEntry(id, earliest.id);
    });
    expect(removed).not.toBeNull();
    expect(valueOf(id)).toBe(0);

    await act(() => {
      current().store.restoreEntry(id, removed!);
    });
    expect(valueOf(id)).toBe(5);
    expect(isConsistent(id)).toBe(true);
  });

  it('deleting a tracker removes its history shard and nothing else', async () => {
    await mount();
    const keep = await createCounter('Water');
    const drop = await createCounter('Walks');
    await act(() => {
      current().store.tap(keep, 'up');
      current().store.tap(drop, 'up');
    });
    await act(() => current().store.flush());
    await AsyncStorage.setItem('other.library.key', 'untouched');

    await act(() => {
      current().store.deleteTracker(drop);
    });
    await act(() => current().store.flush());

    await expect(AsyncStorage.getItem(eventsKey(drop))).resolves.toBeNull();
    await expect(AsyncStorage.getItem(eventsKey(keep))).resolves.not.toBeNull();
    await expect(AsyncStorage.getItem('other.library.key')).resolves.toBe('untouched');
  });
});
