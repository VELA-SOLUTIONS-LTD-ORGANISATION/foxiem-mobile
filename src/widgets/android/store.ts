import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalId } from '@/utils/id';

import { appendAction, parseActions, pendingFor } from '../inbox';
import { settleSnapshot } from '../snapshot';
import { SNAPSHOT_VERSION, WIDGET_KEYS, type WidgetAction, type WidgetDirection, type WidgetSnapshot, type WidgetTracker } from '../model';

/**
 * Storage the Android widget handler shares with the app. The handler can run while the app UI is not
 * open, so it only ever touches these keys and never the tracker store itself.
 */

export async function loadSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_KEYS.snapshot);
    if (!raw) {
      return null;
    }
    const value = JSON.parse(raw) as WidgetSnapshot;
    // Read as of now: a Pro entitlement that lapsed while the app was closed downgrades the widget.
    return value && value.v === SNAPSHOT_VERSION && Array.isArray(value.trackers) ? settleSnapshot(value, Date.now()) : null;
  } catch {
    return null;
  }
}

export async function loadPending(snapshot: WidgetSnapshot | null): Promise<WidgetAction[]> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_KEYS.inbox);
    return pendingFor(parseActions(raw), new Set(snapshot?.applied ?? []));
  } catch {
    return [];
  }
}

export async function recordTap(trackerId: string, direction: WidgetDirection): Promise<void> {
  const snapshot = await loadSnapshot();
  const raw = await AsyncStorage.getItem(WIDGET_KEYS.inbox);
  const action: WidgetAction = { id: createLocalId(), trackerId, direction, at: Date.now() };
  await AsyncStorage.setItem(WIDGET_KEYS.inbox, appendAction(raw, snapshot?.applied ?? [], action));
}

type WidgetConfig = Record<string, string>;

async function loadConfig(): Promise<WidgetConfig> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_KEYS.config);
    const value = raw ? (JSON.parse(raw) as unknown) : null;
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as WidgetConfig) : {};
  } catch {
    return {};
  }
}

export async function getWidgetTracker(widgetId: number): Promise<string | null> {
  return (await loadConfig())[String(widgetId)] ?? null;
}

export async function setWidgetTracker(widgetId: number, trackerId: string): Promise<void> {
  const config = await loadConfig();
  await AsyncStorage.setItem(WIDGET_KEYS.config, JSON.stringify({ ...config, [String(widgetId)]: trackerId }));
}

export async function removeWidgetConfig(widgetId: number): Promise<void> {
  const config = await loadConfig();
  if (String(widgetId) in config) {
    delete config[String(widgetId)];
    await AsyncStorage.setItem(WIDGET_KEYS.config, JSON.stringify(config));
  }
}

/** The tracker a single-tracker widget shows: Pro can choose per widget, Free always shows the primary one. */
export function pickTracker(snapshot: WidgetSnapshot, chosenId: string | null): WidgetTracker | null {
  if (snapshot.isPro && chosenId) {
    const chosen = snapshot.trackers.find((tracker) => tracker.id === chosenId);
    if (chosen) {
      return chosen;
    }
  }
  return snapshot.trackers.find((tracker) => tracker.id === snapshot.primaryId) ?? snapshot.trackers[0] ?? null;
}
