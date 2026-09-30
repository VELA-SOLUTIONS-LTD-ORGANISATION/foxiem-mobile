import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlexWidget, IconWidget, TextWidget, type ColorProp, type WidgetInfo } from 'react-native-android-widget';

import { darkPalette, lightPalette } from '@/theme/palette';

import { resolveDisplay } from '../snapshot';
import type { WidgetAction, WidgetLabels, WidgetSnapshot, WidgetTracker } from '../model';

/**
 * Android widget layouts. These are the widget library's own primitives (rendered to native
 * RemoteViews), not React Native views. Every surface is drawn twice, light and dark, so the widget
 * follows the system theme without waking the app.
 */

export const ICON_FONT = 'MaterialCommunityIcons';

export type Scheme = 'light' | 'dark';

const FONT_GLYPHS = MaterialCommunityIcons.glyphMap as Record<string, number>;

function glyph(name: string, fallback: string): string {
  const code = FONT_GLYPHS[name] ?? FONT_GLYPHS[fallback];
  return code ? String.fromCodePoint(code) : '';
}

function neutrals(scheme: Scheme) {
  const palette = scheme === 'dark' ? darkPalette : lightPalette;
  return {
    background: palette.surface as ColorProp,
    ink: palette.ink as ColorProp,
    secondary: palette.inkSecondary as ColorProp,
    track: palette.track as ColorProp,
    danger: palette.danger as ColorProp,
    improvement: palette.improvement as ColorProp,
    action: palette.action as ColorProp,
    onAction: palette.onAction as ColorProp,
  };
}

function toneFor(tracker: WidgetTracker, scheme: Scheme, isPro: boolean) {
  const base = neutrals(scheme);
  if (!isPro) {
    // Free widgets keep to the neutral ink treatment; tracker colour is part of Pro.
    return { solid: base.action, ink: base.ink, onSolid: base.onAction };
  }
  const tone = scheme === 'dark' ? tracker.dark : tracker.light;
  return { solid: tone.solid as ColorProp, ink: tone.ink as ColorProp, onSolid: tone.onSolid as ColorProp };
}

function stateLabel(state: ReturnType<typeof resolveDisplay>['state'], labels: WidgetLabels): string | null {
  switch (state) {
    case 'reached':
      return labels.goalReached;
    case 'over':
      return labels.overLimit;
    case 'atLimit':
      return labels.atLimit;
    default:
      return null;
  }
}

const trackerUri = (id: string) => ({ uri: `foxiem://tracker/${id}` });

function RoundButton({
  tracker,
  direction,
  scheme,
  isPro,
  size,
  enabled,
  label,
}: {
  tracker: WidgetTracker;
  direction: 'up' | 'down';
  scheme: Scheme;
  isPro: boolean;
  size: number;
  enabled: boolean;
  label: string;
}) {
  const tone = toneFor(tracker, scheme, isPro);
  const base = neutrals(scheme);
  return (
    <FlexWidget
      clickAction="FOXIEM_TAP"
      clickActionData={{ trackerId: tracker.id, direction }}
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: direction === 'up' ? tone.solid : base.track,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <IconWidget
        font={ICON_FONT}
        icon={glyph(direction === 'up' ? 'plus' : 'minus', 'plus')}
        size={Math.round(size * 0.5)}
        style={{ color: direction === 'up' ? tone.onSolid : enabled ? base.ink : base.secondary }}
      />
    </FlexWidget>
  );
}

function Progress({ progress, scheme, width, color }: { progress: number | null; scheme: Scheme; width: number; color: ColorProp }) {
  if (progress === null) {
    return null;
  }
  const base = neutrals(scheme);
  const filled = Math.round(width * progress);
  return (
    <FlexWidget style={{ width, height: 6, borderRadius: 3, backgroundColor: base.track, flexDirection: 'row' }}>
      {filled > 0 ? <FlexWidget style={{ width: filled, height: 6, borderRadius: 3, backgroundColor: color }} /> : null}
    </FlexWidget>
  );
}

export function CounterView({
  tracker,
  snapshot,
  pending,
  info,
  scheme,
  now,
}: {
  tracker: WidgetTracker;
  snapshot: WidgetSnapshot;
  pending: readonly WidgetAction[];
  info: WidgetInfo;
  scheme: Scheme;
  now: number;
}) {
  const isPro = snapshot.isPro;
  const base = neutrals(scheme);
  const tone = toneFor(tracker, scheme, isPro);
  const display = resolveDisplay(tracker, pending, now);
  const wide = info.width >= 180;
  const tall = info.height >= 170;
  const padding = 14;
  const inner = Math.max(40, info.width - padding * 2);
  const label = stateLabel(display.state, snapshot.labels);
  const canDecrement = isPro && (display.value > 0 || display.pending > 0);
  const stateColor = display.state === 'over' ? base.danger : display.state === 'reached' ? base.improvement : base.secondary;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={trackerUri(tracker.id)}
      accessibilityLabel={`${tracker.name}, ${display.value} ${tracker.caption}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        padding,
        borderRadius: 24,
        backgroundColor: base.background,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <IconWidget font={ICON_FONT} icon={glyph(tracker.glyph, 'tally-mark-5')} size={18} style={{ color: tone.ink }} />
        <TextWidget
          text={tracker.name}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 14, fontWeight: '600', color: base.ink, marginLeft: 8 }}
        />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', width: 'match_parent', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <TextWidget text={String(display.value)} style={{ fontSize: tall || wide ? 40 : 34, fontWeight: 'bold', color: base.ink }} />
            <TextWidget text={` ${tracker.caption}`} maxLines={1} truncate="END" style={{ fontSize: 13, color: base.secondary, marginBottom: 6 }} />
          </FlexWidget>
          {label && (wide || tall) ? <TextWidget text={label} style={{ fontSize: 13, fontWeight: '600', color: stateColor }} /> : null}
        </FlexWidget>
        {wide ? (
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isPro ? (
              <FlexWidget style={{ marginRight: 8 }}>
                <RoundButton tracker={tracker} direction="down" scheme={scheme} isPro={isPro} size={48} enabled={canDecrement} label={tracker.name} />
              </FlexWidget>
            ) : null}
            <RoundButton tracker={tracker} direction="up" scheme={scheme} isPro={isPro} size={48} enabled label={tracker.name} />
          </FlexWidget>
        ) : (
          <RoundButton tracker={tracker} direction="up" scheme={scheme} isPro={isPro} size={44} enabled label={tracker.name} />
        )}
      </FlexWidget>

      <Progress progress={display.progress} scheme={scheme} width={inner} color={display.state === 'over' ? base.danger : tone.solid} />
    </FlexWidget>
  );
}

export function TrackersView({
  snapshot,
  pending,
  info,
  scheme,
  now,
}: {
  snapshot: WidgetSnapshot;
  pending: readonly WidgetAction[];
  info: WidgetInfo;
  scheme: Scheme;
  now: number;
}) {
  const base = neutrals(scheme);
  const rows = Math.max(1, Math.min(6, Math.floor((info.height - 24) / 56)));
  const shown = snapshot.trackers.slice(0, rows);
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        padding: 12,
        borderRadius: 24,
        backgroundColor: base.background,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {shown.map((tracker) => {
        const display = resolveDisplay(tracker, pending, now);
        const tone = toneFor(tracker, scheme, true);
        return (
          <FlexWidget
            key={tracker.id}
            style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', justifyContent: 'space-between', height: 48 }}
          >
            <FlexWidget
              clickAction="OPEN_URI"
              clickActionData={trackerUri(tracker.id)}
              accessibilityLabel={`${tracker.name}, ${display.value} ${tracker.caption}`}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            >
              <IconWidget font={ICON_FONT} icon={glyph(tracker.glyph, 'tally-mark-5')} size={20} style={{ color: tone.ink }} />
              <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 10 }}>
                <TextWidget text={tracker.name} maxLines={1} truncate="END" style={{ fontSize: 14, fontWeight: '600', color: base.ink }} />
                <TextWidget
                  text={`${display.value} ${tracker.caption}`}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 12, color: display.state === 'over' ? base.danger : base.secondary }}
                />
              </FlexWidget>
            </FlexWidget>
            <RoundButton tracker={tracker} direction="up" scheme={scheme} isPro size={40} enabled label={tracker.name} />
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}

/** A locked Pro widget, or the "nothing to show" state; either way a tap opens Foxiem in the right place. */
export function MessageView({ title, body, uri, scheme }: { title: string; body: string; uri: string; scheme: Scheme }) {
  const base = neutrals(scheme);
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        padding: 14,
        borderRadius: 24,
        backgroundColor: base.background,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <TextWidget text={title} maxLines={2} style={{ fontSize: 15, fontWeight: 'bold', color: base.ink }} />
      <TextWidget text={body} maxLines={3} style={{ fontSize: 12, color: base.secondary, marginTop: 4 }} />
    </FlexWidget>
  );
}
