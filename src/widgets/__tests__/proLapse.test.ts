import { at, makeTracker } from '@/domain/__tests__/helpers';
import type { EventsByTracker } from '@/domain/types';
import { FREE_ENTITLEMENT, OFFLINE_GRACE_MS, proAccessUntil, type Entitlement } from '@/pro/entitlement';

import { buildWidgetSnapshot, settleSnapshot } from '../snapshot';

const t = (key: string) => key;
const NOW = at(2026, 3, 11, 10);

describe('Pro lapsing while the app is closed', () => {
  const water = makeTracker({ name: 'water', intent: 'reach', period: 'day', target: 8 });
  const steps = makeTracker({ name: 'steps' });
  const events: EventsByTracker = { [water.id]: [], [steps.id]: [] };
  const proUntil = NOW.getTime() + 86_400_000;
  const base = { events, now: NOW, weekStart: 1 as const, language: 'en', applied: [], t };
  const snapshot = buildWidgetSnapshot({ ...base, chosenTrackerId: steps.id, trackers: [water, steps], isPro: true, proUntil });

  it('keeps Pro until the entitlement runs out, then behaves as Free with only the primary tracker', () => {
    expect(snapshot.trackers).toHaveLength(2);
    expect(settleSnapshot(snapshot, proUntil)).toBe(snapshot);
    const lapsed = settleSnapshot(snapshot, proUntil + 1);
    expect(lapsed.isPro).toBe(false);
    expect(lapsed.trackers.map((tracker) => tracker.id)).toEqual([steps.id]);
  });

  it('never downgrades lifetime snapshots on its own, and Free snapshots carry no deadline', () => {
    const lifetime = { ...snapshot, proUntil: null };
    expect(settleSnapshot(lifetime, NOW.getTime() + 10 * 365 * 86_400_000)).toBe(lifetime);
    const free = buildWidgetSnapshot({ ...base, chosenTrackerId: null, trackers: [water], isPro: false, proUntil: 123 });
    expect(free.proUntil).toBeNull();
  });

  it('derives the deadline from the entitlement, including the offline grace window', () => {
    const active: Entitlement = { ...FREE_ENTITLEMENT, status: 'active', plan: 'yearly', expiresAt: '2026-04-01T00:00:00.000Z', source: 'store' };
    expect(proAccessUntil(active)).toBe(Date.parse('2026-04-01T00:00:00.000Z') + OFFLINE_GRACE_MS);
    expect(proAccessUntil({ ...active, status: 'lifetime', plan: 'lifetime', expiresAt: null })).toBeNull();
    expect(proAccessUntil(FREE_ENTITLEMENT)).toBeNull();
  });
});
