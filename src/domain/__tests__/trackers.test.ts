import { buildEventsCsv, buildWeeklySummaryCsv } from '../csv';
import { findTemplate, draftFromTemplate, suggestIcon, TRACKER_TEMPLATES } from '../templates';
import {
  activeTrackers,
  coerceDraftForIntent,
  createTracker,
  emptyDraft,
  moveTracker,
  pickColor,
  validateDraft,
} from '../trackers';
import { TRACKER_INTENTS } from '../types';

import { at, makeEvents, makeTracker } from './helpers';

describe('tracker creation', () => {
  it('creates a valid tracker for every intent with sensible defaults', () => {
    for (const intent of TRACKER_INTENTS) {
      const draft = coerceDraftForIntent(emptyDraft({ name: `T ${intent}` }), intent);
      expect(validateDraft(draft, [])).toBeNull();
      const tracker = createTracker(draft, [], { now: at(2026, 3, 1) });
      expect(tracker.intent).toBe(intent);
      expect(tracker.archivedAt).toBeNull();
    }
  });

  it('Stay under cannot use an all-time period; consistency stays weekly with 1–7 days', () => {
    expect(coerceDraftForIntent(emptyDraft({ period: 'all' }), 'limit').period).toBe('day');
    const rhythm = coerceDraftForIntent(emptyDraft({ target: 12 }), 'consistency');
    expect(rhythm).toMatchObject({ period: 'week', target: 7 });
    expect(coerceDraftForIntent(emptyDraft({ target: 5 }), 'count').target).toBeNull();
  });

  it('validates names, targets and ranges', () => {
    const existing = [makeTracker({ name: 'Water' })];
    expect(validateDraft(emptyDraft({ name: '   ' }), existing)).toBe('nameRequired');
    expect(validateDraft(emptyDraft({ name: ' water ' }), existing)).toBe('nameDuplicate');
    expect(validateDraft(emptyDraft({ name: 'x'.repeat(41) }), existing)).toBe('nameTooLong');
    expect(validateDraft(emptyDraft({ name: 'Coffee', intent: 'limit', period: 'day', target: null }), existing)).toBe('targetRequired');
    expect(validateDraft(emptyDraft({ name: 'Gym', intent: 'consistency', period: 'week', target: 9 }), existing)).toBe('targetRange');
    expect(validateDraft(emptyDraft({ name: 'Reps', step: 0 }), existing)).toBe('stepRange');
    expect(validateDraft(emptyDraft({ name: 'Water' }), existing, { editingId: existing[0]!.id })).toBeNull();
  });

  it('archived trackers do not block a name and are excluded from Home', () => {
    const archived = { ...makeTracker({ name: 'Water' }), archivedAt: at(2026, 3, 1).toISOString() };
    expect(validateDraft(emptyDraft({ name: 'Water' }), [archived])).toBeNull();
    expect(activeTrackers([archived])).toEqual([]);
  });

  it('reorders active trackers', () => {
    const a = { ...makeTracker({ name: 'A' }), sortIndex: 0 };
    const b = { ...makeTracker({ name: 'B' }), sortIndex: 1 };
    const c = { ...makeTracker({ name: 'C' }), sortIndex: 2 };
    const moved = moveTracker([a, b, c], c.id, -1);
    expect(activeTrackers(moved).map((tracker) => tracker.name)).toEqual(['A', 'C', 'B']);
    expect(moveTracker([a, b, c], a.id, -1)).toEqual([a, b, c]);
  });

  it('spreads colours across trackers', () => {
    const fox = makeTracker({ name: 'A', color: 'fox' });
    expect(pickColor([fox])).not.toBe('fox');
  });
});

describe('templates teach the model', () => {
  it('covers every intent and matches the brief defaults', () => {
    const intents = new Set(TRACKER_TEMPLATES.map((template) => template.intent));
    expect(intents).toEqual(new Set(TRACKER_INTENTS));
    expect(findTemplate('coffee')).toMatchObject({ intent: 'limit', period: 'day', target: 3 });
    expect(findTemplate('water')).toMatchObject({ intent: 'reach', target: 8 });
    expect(findTemplate('cigarettes')?.intent).toBe('reduce');
    expect(findTemplate('knitting')?.intent).toBe('count');
    expect(findTemplate('dogWalks')?.intent).toBe('consistency');
  });

  it('builds an editable draft', () => {
    const draft = draftFromTemplate(findTemplate('water')!, { name: 'Water', unit: 'glasses' });
    expect(draft).toMatchObject({ name: 'Water', unit: 'glasses', templateId: 'water', intent: 'reach' });
  });

  it('suggests icons from names in several languages', () => {
    expect(suggestIcon('Morning coffee')).toBe('coffee-outline');
    expect(suggestIcon('Kahve')).toBe('coffee-outline');
    expect(suggestIcon('Lesen')).toBe('book-open-page-variant-outline');
    expect(suggestIcon('Zzz')).toBeNull();
  });
});

describe('csv export', () => {
  it('escapes cells and neutralises spreadsheet formulas in free text', () => {
    const tracker = makeTracker({ name: '=SUM(A1), "quoted"' });
    const events = makeEvents(tracker, [[at(2026, 3, 2, 9, 5), 2]]);
    const csv = buildEventsCsv([tracker], { [tracker.id]: [{ ...events[0]!, note: 'line\nbreak' }] });
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('tracker,tracker_id,intent');
    expect(csv).toContain('"\'=SUM(A1), ""quoted"""');
    expect(csv).toContain('2026-03-02,09:05');
    expect(csv).toContain('"line\nbreak"');
  });

  it('builds weekly totals with target status', () => {
    const tracker = makeTracker({ name: 'Takeaway', intent: 'limit', period: 'week', target: 2 });
    const events = makeEvents(tracker, [[at(2026, 3, 2), 1], [at(2026, 3, 10), 3]]);
    const csv = buildWeeklySummaryCsv([tracker], { [tracker.id]: events }, { start: at(2026, 3, 2, 0), end: at(2026, 3, 16, 0) }, 1);
    expect(csv).toContain('Takeaway,limit,2026-03-02,1,2,within_limit');
    expect(csv).toContain('Takeaway,limit,2026-03-09,3,2,over_limit');
  });
});
