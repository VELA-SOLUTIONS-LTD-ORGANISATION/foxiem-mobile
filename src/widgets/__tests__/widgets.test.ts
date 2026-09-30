import { at, dailyEntries, makeEvents, makeTracker } from '@/domain/__tests__/helpers';
import type { EventsByTracker } from '@/domain/types';

import { drainInbox, appendAction, freshActions, parseActions, pendingFor, LEDGER_LIMIT } from '../inbox';
import type { WidgetAction, WidgetTracker } from '../model';
import { buildWidgetSnapshot, resolveDisplay, resolvePrimaryId } from '../snapshot';

const t = (key: string) => key;
const NOW = at(2026, 3, 11, 10);

function press(id: string, trackerId: string, direction: 'up' | 'down' = 'up', when = NOW.getTime()): WidgetAction {
  return { id, trackerId, direction, at: when };
}

function widgetTracker(overrides: Partial<WidgetTracker> = {}): WidgetTracker {
  return {
    id: 't1',
    name: 'Water',
    symbol: 'drop',
    glyph: 'water',
    intent: 'reach',
    period: 'day',
    light: { fill: '#000', ink: '#fff', soft: '#eee' },
    dark: { fill: '#000', ink: '#fff', soft: '#111' },
    value: 3,
    target: 8,
    step: 1,
    caption: '',
    periodEnd: NOW.getTime() + 3_600_000,
    today: 3,
    canDecrement: true,
    ...overrides,
  } as WidgetTracker;
}

describe('buildWidgetSnapshot', () => {
  const water = makeTracker({ name: 'water', intent: 'reach', period: 'day', target: 8 });
  const steps = makeTracker({ name: 'steps' });
  const events: EventsByTracker = {
    [water.id]: makeEvents(water, dailyEntries(at(2026, 3, 11), [3])),
    [steps.id]: [],
  };
  const base = { events, now: NOW, weekStart: 1 as const, language: 'en', chosenTrackerId: null, applied: [], proUntil: null, t };

  it('gives Free a single tracker, the chosen one when it is still active', () => {
    const snapshot = buildWidgetSnapshot({ ...base, trackers: [water, steps], isPro: false, chosenTrackerId: steps.id });
    expect(snapshot.trackers.map((tracker) => tracker.id)).toEqual([steps.id]);
    expect(snapshot.primaryId).toBe(steps.id);
    expect(snapshot.isPro).toBe(false);
  });

  it('gives Pro every active tracker with the primary first, and skips archived ones', () => {
    const archived = { ...steps, archivedAt: NOW.toISOString() };
    const snapshot = buildWidgetSnapshot({ ...base, trackers: [water, archived], isPro: true });
    expect(snapshot.trackers.map((tracker) => tracker.id)).toEqual([water.id]);
    const both = buildWidgetSnapshot({ ...base, trackers: [water, steps], isPro: true, chosenTrackerId: steps.id });
    expect(both.trackers[0].id).toBe(steps.id);
    expect(both.trackers).toHaveLength(2);
  });

  it('falls back when the chosen tracker is gone and handles no trackers', () => {
    expect(resolvePrimaryId([water], 'missing')).toBe(water.id);
    expect(resolvePrimaryId([], 'missing')).toBeNull();
    const empty = buildWidgetSnapshot({ ...base, trackers: [], isPro: true });
    expect(empty.trackers).toEqual([]);
    expect(empty.primaryId).toBeNull();
  });

  it('reports progress inputs and carries the applied ledger, capped', () => {
    const snapshot = buildWidgetSnapshot({ ...base, trackers: [water], isPro: true, applied: ['a', 'b'] });
    expect(snapshot.trackers[0]).toMatchObject({ value: 3, target: 8, step: 1, canDecrement: true });
    expect(snapshot.applied).toEqual(['a', 'b']);
    const many = Array.from({ length: 900 }, (_, index) => `id${index}`);
    expect(buildWidgetSnapshot({ ...base, trackers: [water], isPro: true, applied: many }).applied.length).toBeLessThan(900);
  });
});

describe('resolveDisplay', () => {
  it('adds presses made since the snapshot', () => {
    const display = resolveDisplay(widgetTracker(), [press('1', 't1'), press('2', 't1')], NOW.getTime());
    expect(display).toMatchObject({ value: 5, pending: 2, state: 'neutral' });
    expect(display.progress).toBeCloseTo(5 / 8);
  });

  it('ignores presses for other trackers and never goes below zero', () => {
    expect(resolveDisplay(widgetTracker({ value: 0 }), [press('1', 'other')], NOW.getTime()).value).toBe(0);
    expect(resolveDisplay(widgetTracker({ value: 1 }), [press('1', 't1', 'down'), press('2', 't1', 'down')], NOW.getTime()).value).toBe(0);
  });

  it('marks reached and over states', () => {
    expect(resolveDisplay(widgetTracker({ value: 7 }), [press('1', 't1')], NOW.getTime()).state).toBe('reached');
    const limit = widgetTracker({ intent: 'limit', value: 2, target: 3 });
    expect(resolveDisplay(limit, [press('1', 't1')], NOW.getTime()).state).toBe('atLimit');
    expect(resolveDisplay(limit, [press('1', 't1'), press('2', 't1')], NOW.getTime())).toMatchObject({ state: 'over', progress: 1 });
  });

  it('starts a rolled-over period from zero and only counts later presses', () => {
    const tracker = widgetTracker({ periodEnd: NOW.getTime() });
    const later = NOW.getTime() + 1000;
    const display = resolveDisplay(tracker, [press('old', 't1', 'up', NOW.getTime() - 10), press('new', 't1', 'up', later)], later);
    expect(display.value).toBe(1);
  });

  it('counts a consistency day once however many presses', () => {
    const tracker = widgetTracker({ intent: 'consistency', value: 2, today: 0, target: 7, period: 'week' });
    const display = resolveDisplay(tracker, [press('1', 't1'), press('2', 't1'), press('3', 't1')], NOW.getTime());
    expect(display.value).toBe(3);
    const undone = resolveDisplay(tracker, [press('1', 't1'), press('2', 't1', 'down')], NOW.getTime());
    expect(undone.value).toBe(2);
  });
});

describe('inbox', () => {
  it('drops malformed entries and duplicates', () => {
    const raw = JSON.stringify([
      press('a', 't1'),
      press('a', 't1'),
      { id: '', trackerId: 't1', direction: 'up', at: 1 },
      { id: 'b', trackerId: 't1', direction: 'sideways', at: 1 },
      { id: 'c', trackerId: 't1', direction: 'up', at: 'soon' },
      'nope',
      null,
    ]);
    expect(parseActions(raw).map((action) => action.id)).toEqual(['a']);
    expect(parseActions('not json')).toEqual([]);
    expect(parseActions(undefined)).toEqual([]);
    expect(parseActions([press('z', 't1')])).toHaveLength(1);
  });

  it('appendAction forgets acknowledged presses and never duplicates', () => {
    const first = appendAction(null, [], press('a', 't1'));
    const second = appendAction(first, [], press('b', 't1'));
    const third = appendAction(second, ['a'], press('c', 't1'));
    expect(parseActions(third).map((action) => action.id)).toEqual(['b', 'c']);
    expect(parseActions(appendAction(third, [], press('c', 't1')))).toHaveLength(2);
  });

  it('freshActions skips applied ids, orders oldest first and clamps future stamps', () => {
    const now = NOW.getTime();
    const fresh = freshActions(
      [press('late', 't1', 'up', now - 10), press('early', 't1', 'up', now - 1000), press('done', 't1'), press('future', 't1', 'up', now + 3_600_000)],
      new Set(['done']),
      now,
    );
    expect(fresh.map((action) => action.id)).toEqual(['early', 'late', 'future']);
    expect(fresh[2].at).toBe(now);
  });

  it('pendingFor lists only unapplied presses', () => {
    expect(pendingFor([press('a', 't1'), press('b', 't1')], new Set(['a'])).map((action) => action.id)).toEqual(['b']);
  });
});

describe('drainInbox', () => {
  function setup(inbox: WidgetAction[], initialLedger: string[] = []) {
    const state = { ledger: [...initialLedger], acked: [] as string[], applied: [] as WidgetAction[] };
    const input = {
      bridge: {
        readInbox: async () => JSON.stringify(inbox),
        afterApply: async (ids: string[]) => {
          state.acked.push(...ids);
        },
      },
      ledger: {
        read: async () => state.ledger,
        write: async (ids: string[]) => {
          state.ledger = ids;
        },
      },
      apply: (actions: WidgetAction[]) => {
        state.applied.push(...actions);
        return actions.length;
      },
      now: NOW.getTime(),
    };
    return { state, input };
  }

  it('applies each press once, even when drained repeatedly', async () => {
    const { state, input } = setup([press('a', 't1'), press('b', 't1')]);
    const first = await drainInbox(input);
    const second = await drainInbox(input);
    expect(first.applied).toBe(2);
    expect(second.applied).toBe(0);
    expect(state.applied.map((action) => action.id)).toEqual(['a', 'b']);
    expect(state.ledger).toEqual(['a', 'b']);
    expect(state.acked).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('skips presses recorded in the ledger by an earlier run that crashed before cleanup', async () => {
    const { state, input } = setup([press('a', 't1'), press('b', 't1')], ['a']);
    const result = await drainInbox(input);
    expect(result.applied).toBe(1);
    expect(state.applied.map((action) => action.id)).toEqual(['b']);
  });

  it('does nothing for an empty or garbage inbox', async () => {
    const { input } = setup([]);
    expect(await drainInbox(input)).toMatchObject({ applied: 0, seen: 0 });
    const garbage = { ...input, bridge: { readInbox: async () => '{{{' } };
    expect(await drainInbox(garbage)).toMatchObject({ applied: 0, seen: 0 });
  });

  it('keeps the ledger bounded', async () => {
    const old = Array.from({ length: LEDGER_LIMIT }, (_, index) => `old${index}`);
    const { state, input } = setup([press('fresh', 't1')], old);
    await drainInbox(input);
    expect(state.ledger).toHaveLength(LEDGER_LIMIT);
    expect(state.ledger[state.ledger.length - 1]).toBe('fresh');
  });
});
