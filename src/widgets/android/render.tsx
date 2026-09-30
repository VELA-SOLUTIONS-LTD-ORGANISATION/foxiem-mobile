import type { JSX } from 'react';
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget';

import { loadPending, loadSnapshot, getWidgetTracker, pickTracker } from './store';
import { CounterView, MessageView, TrackersView } from './views';

export const COUNTER_WIDGET = 'FoxiemCounter';
export const TRACKERS_WIDGET = 'FoxiemTrackers';

const FALLBACK_TITLE = 'Foxiem';
const FALLBACK_BODY = 'Open Foxiem to get started';

/** Builds the light and dark layouts for one widget instance from the shared snapshot. */
export async function renderWidgetFor(info: WidgetInfo): Promise<WidgetRepresentation> {
  const snapshot = await loadSnapshot();
  const both = (make: (scheme: 'light' | 'dark') => JSX.Element): WidgetRepresentation => ({
    light: make('light'),
    dark: make('dark'),
  });

  if (!snapshot || snapshot.trackers.length === 0) {
    const title = snapshot?.labels.empty ?? FALLBACK_BODY;
    return both((scheme) => <MessageView title={title} body={snapshot?.labels.open ?? FALLBACK_TITLE} uri="foxiem://home" scheme={scheme} />);
  }

  const pending = await loadPending(snapshot);
  const now = Date.now();

  if (info.widgetName === TRACKERS_WIDGET) {
    if (!snapshot.isPro) {
      return both((scheme) => (
        <MessageView title={snapshot.labels.locked} body={snapshot.labels.lockedBody} uri="foxiem://pro?feature=widgets" scheme={scheme} />
      ));
    }
    return both((scheme) => <TrackersView snapshot={snapshot} pending={pending} info={info} scheme={scheme} now={now} />);
  }

  const tracker = pickTracker(snapshot, await getWidgetTracker(info.widgetId));
  if (!tracker) {
    return both((scheme) => <MessageView title={snapshot.labels.empty} body={snapshot.labels.open} uri="foxiem://home" scheme={scheme} />);
  }
  return both((scheme) => <CounterView tracker={tracker} snapshot={snapshot} pending={pending} info={info} scheme={scheme} now={now} />);
}
