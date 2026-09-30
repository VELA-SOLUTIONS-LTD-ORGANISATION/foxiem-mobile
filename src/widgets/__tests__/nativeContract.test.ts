/**
 * The Swift widget and Watch code cannot be compiled on this machine, so the contract they share with the
 * app is checked here instead: every Codable struct is parsed from the Swift source and compared with what
 * `buildWidgetSnapshot` really emits. A field added on one side only, or renamed, fails this test rather
 * than silently blanking a widget on a phone.
 */
import fs from 'fs';
import path from 'path';

import { at, dailyEntries, makeEvents, makeTracker } from '@/domain/__tests__/helpers';
import type { EventsByTracker } from '@/domain/types';

import { APP_GROUP, URL_SCHEME, WIDGET_KEYS } from '../model';
import { buildWidgetSnapshot } from '../snapshot';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

type Field = { name: string; type: string; optional: boolean };

function parseStructs(source: string): Record<string, Field[]> {
  const structs: Record<string, Field[]> = {};
  const header = /^struct (\w+)[^{\n]*\{\n([\s\S]*?)^\}/gm;
  for (const match of source.matchAll(header)) {
    const fields: Field[] = [];
    for (const line of match[2].split('\n')) {
      const field = /^ {4}let (\w+): (\[?\w+\]?)(\?)?\s*$/.exec(line);
      if (field) {
        fields.push({ name: field[1], type: field[2], optional: Boolean(field[3]) });
      }
    }
    structs[match[1]] = fields;
  }
  return structs;
}

const PRIMITIVES: Record<string, string> = { String: 'string', Double: 'number', Int: 'number', Bool: 'boolean' };

/** Everything Swift would fail to decode from `value`, as readable strings. */
function decodeProblems(structs: Record<string, Field[]>, structName: string, value: unknown, where: string): string[] {
  const fields = structs[structName];
  if (!fields) {
    return [`${where}: no Swift struct ${structName}`];
  }
  const record = value as Record<string, unknown>;
  const problems: string[] = [];
  for (const field of fields) {
    const here = `${where}.${field.name}`;
    const item = record[field.name];
    if (item === null || item === undefined) {
      if (!field.optional) {
        problems.push(`${here}: required by Swift (${field.type}) but missing or null`);
      }
      continue;
    }
    const isArray = field.type.startsWith('[');
    const inner = field.type.replace(/[[\]]/g, '');
    const check = (single: unknown, label: string) => {
      if (PRIMITIVES[inner]) {
        if (typeof single !== PRIMITIVES[inner]) {
          problems.push(`${label}: expected ${PRIMITIVES[inner]}, got ${typeof single}`);
        }
      } else {
        problems.push(...decodeProblems(structs, inner, single, label));
      }
    };
    if (isArray) {
      if (!Array.isArray(item)) {
        problems.push(`${here}: expected array`);
      } else {
        item.forEach((single, index) => check(single, `${here}[${index}]`));
      }
    } else {
      check(item, here);
    }
  }
  return problems;
}

const water = makeTracker({ name: 'water', intent: 'reach', period: 'day', target: 8 });
const steps = makeTracker({ name: 'steps' });
const events: EventsByTracker = {
  [water.id]: makeEvents(water, dailyEntries(at(2026, 3, 11), [3])),
  [steps.id]: [],
};
const now = at(2026, 3, 11, 10);

function snapshotFor(overrides: { trackers: typeof water[]; isPro: boolean; proUntil: number | null }) {
  return buildWidgetSnapshot({
    events,
    now,
    weekStart: 1,
    language: 'en',
    chosenTrackerId: null,
    applied: ['wa-1'],
    t: (key: string) => key,
    ...overrides,
  });
}

const widgetStructs = parseStructs(read('targets/widget/Models.swift'));
const watchStructs = parseStructs(read('targets/watch/Models.swift'));

const samples = {
  'Pro with a deadline': snapshotFor({ trackers: [water, steps], isPro: true, proUntil: now.getTime() + 1000 }),
  'lifetime Pro': snapshotFor({ trackers: [water, steps], isPro: true, proUntil: null }),
  Free: snapshotFor({ trackers: [water, steps], isPro: false, proUntil: null }),
  'no trackers': snapshotFor({ trackers: [], isPro: true, proUntil: null }),
};

describe('Swift ↔ TypeScript snapshot contract', () => {
  it('finds the structs it is meant to check', () => {
    for (const structs of [widgetStructs, watchStructs]) {
      expect(Object.keys(structs)).toEqual(expect.arrayContaining(['Tone', 'WidgetLabels', 'TrackerInfo', 'Snapshot', 'PressAction']));
      expect(structs.Snapshot.length).toBeGreaterThan(6);
    }
  });

  describe.each([
    ['widget', widgetStructs],
    ['watch', watchStructs],
  ] as const)('%s target', (_name, structs) => {
    it.each(Object.entries(samples))('decodes the %s snapshot', (_label, snapshot) => {
      expect(decodeProblems(structs, 'Snapshot', snapshot, 'snapshot')).toEqual([]);
    });

    it('decodes a press action', () => {
      const action = { id: 'wa-1', trackerId: water.id, direction: 'up', at: now.getTime() };
      expect(decodeProblems(structs, 'PressAction', action, 'action')).toEqual([]);
    });
  });

  it('gives the widget target every field of the snapshot except the Android-only glyph', () => {
    const snapshot = samples['Pro with a deadline'];
    const swift = (name: string) => widgetStructs[name].map((field) => field.name);
    const extra = (obj: object, name: string, allowed: string[] = []) =>
      Object.keys(obj).filter((key) => !swift(name).includes(key) && !allowed.includes(key));
    expect(extra(snapshot, 'Snapshot')).toEqual([]);
    expect(extra(snapshot.labels, 'WidgetLabels')).toEqual([]);
    expect(extra(snapshot.trackers[0], 'TrackerInfo', ['glyph'])).toEqual([]);
    expect(extra(snapshot.trackers[0].dark, 'Tone')).toEqual([]);
  });

  it('shares storage keys, the App Group and the URL scheme with the Swift code', () => {
    const shared = read('targets/widget/Models.swift');
    expect(shared).toContain(`static let appGroup = "${APP_GROUP}"`);
    expect(shared).toContain(`static let snapshotKey = "${WIDGET_KEYS.snapshot}"`);
    expect(shared).toContain(`static let inboxKey = "${WIDGET_KEYS.inbox}"`);
    expect(shared).toContain(`static let scheme = "${URL_SCHEME}"`);

    // Watch: snapshot travels as the application context, presses as user info; the iPhone module reads the same keys.
    const phoneLink = read('targets/watch/PhoneLink.swift');
    const hub = read('modules/foxiem-watch/ios/WatchSessionHub.swift');
    expect(phoneLink).toContain('context["snapshot"]');
    expect(phoneLink).toContain('["action": text]');
    expect(hub).toContain('updateApplicationContext(["snapshot": snapshot])');
    expect(hub).toContain('userInfo["action"]');
  });

  it('declares the App Group on the app and on every extension', () => {
    const app = JSON.parse(read('app.json')) as { expo: { ios: { entitlements: Record<string, string[]> } } };
    expect(app.expo.ios.entitlements['com.apple.security.application-groups']).toEqual([APP_GROUP]);
    expect(read('targets/widget/expo-target.config.js')).toContain(APP_GROUP);
  });
});
