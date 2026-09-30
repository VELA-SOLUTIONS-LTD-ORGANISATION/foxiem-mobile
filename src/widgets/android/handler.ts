import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import type { WidgetDirection } from '../model';
import { COUNTER_WIDGET, renderWidgetFor, TRACKERS_WIDGET } from './render';
import { recordTap, removeWidgetConfig } from './store';

/** Redraw every instance of every Foxiem widget from the latest snapshot and inbox. */
export async function refreshAndroidWidgets(): Promise<void> {
  await Promise.all(
    [COUNTER_WIDGET, TRACKERS_WIDGET].map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: renderWidgetFor }).catch(() => undefined),
    ),
  );
}

/**
 * Runs in the app's JS runtime, with or without the UI open. A press is written to the shared inbox and the
 * widget redraws immediately from snapshot + pending; the app applies the press to the real history the next
 * time it opens (see `WidgetSync`).
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetInfo, widgetAction, clickAction, clickActionData, renderWidget } = props;

  if (widgetAction === 'WIDGET_DELETED') {
    await removeWidgetConfig(widgetInfo.widgetId);
    return;
  }

  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'FOXIEM_TAP') {
    const trackerId = typeof clickActionData?.trackerId === 'string' ? clickActionData.trackerId : null;
    const direction: WidgetDirection | null =
      clickActionData?.direction === 'up' || clickActionData?.direction === 'down' ? clickActionData.direction : null;
    if (trackerId && direction) {
      await recordTap(trackerId, direction);
    }
  }

  renderWidget(await renderWidgetFor(widgetInfo));

  if (widgetAction === 'WIDGET_CLICK') {
    // Other widgets may show the same tracker.
    await refreshAndroidWidgets();
  }
}
