import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { darkPalette, lightPalette } from '@/theme/palette';

import type { WidgetSnapshot } from '../model';
import { renderWidgetFor } from './render';
import { getWidgetTracker, loadSnapshot, setWidgetTracker } from './store';

/**
 * Shown when a Pro user adds or reconfigures the tracker widget. It is a small standalone screen: the widget
 * configuration activity does not have the app's providers, so it reads the shared snapshot directly.
 */
export function WidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const palette = useColorScheme() === 'dark' ? darkPalette : lightPalette;
  const [snapshot, setSnapshot] = useState<WidgetSnapshot | null | undefined>(undefined);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([loadSnapshot(), getWidgetTracker(widgetInfo.widgetId)]).then(([loaded, chosen]) => {
      if (active) {
        setSnapshot(loaded);
        setSelected(chosen ?? loaded?.primaryId ?? null);
      }
    });
    return () => {
      active = false;
    };
  }, [widgetInfo.widgetId]);

  const finish = async (trackerId: string | null) => {
    if (trackerId && snapshot?.isPro) {
      await setWidgetTracker(widgetInfo.widgetId, trackerId);
    }
    renderWidget(await renderWidgetFor(widgetInfo));
    setResult('ok');
  };

  const locked = snapshot ? !snapshot.isPro : false;

  return (
    <View style={[styles.root, { backgroundColor: palette.canvas }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.ink }]}>
        {snapshot?.labels.open ?? 'Foxiem'}
      </Text>
      {snapshot === undefined ? null : snapshot === null || snapshot.trackers.length === 0 ? (
        <Text style={[styles.body, { color: palette.inkSecondary }]}>{snapshot?.labels.empty ?? 'Open Foxiem to get started'}</Text>
      ) : locked ? (
        <View>
          <Text style={[styles.body, { color: palette.inkSecondary }]}>{snapshot.labels.lockedBody}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL('foxiem://pro?feature=widgets')}
            style={[styles.button, { backgroundColor: palette.action }]}
          >
            <Text style={[styles.buttonText, { color: palette.onAction }]}>{snapshot.labels.locked}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView>
          {snapshot.trackers.map((tracker) => {
            const tone = tracker.light;
            const on = selected === tracker.id;
            return (
              <Pressable
                key={tracker.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setSelected(tracker.id)}
                style={[styles.row, { backgroundColor: palette.surface, borderColor: on ? palette.ink : palette.line }]}
              >
                <View style={[styles.swatch, { backgroundColor: tone.solid }]} />
                <Text numberOfLines={1} style={[styles.rowText, { color: palette.ink }]}>
                  {tracker.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => void finish(selected)}
        style={[styles.button, { backgroundColor: palette.action }]}
      >
        <Text style={[styles.buttonText, { color: palette.onAction }]}>OK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  swatch: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  rowText: { flex: 1, fontSize: 16, fontWeight: '600' },
  button: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
