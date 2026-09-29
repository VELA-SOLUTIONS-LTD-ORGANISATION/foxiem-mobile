import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_TRACKER_ICON } from '@/domain/trackers';
import type { TrackerColor } from '@/domain/types';
import { useTheme } from '@/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function isIconName(value: string): value is IconName {
  return value in MaterialCommunityIcons.glyphMap;
}

export function TrackerIcon({ icon, color, size = 40 }: { icon: string; color: TrackerColor; size?: number }) {
  const theme = useTheme();
  const tone = theme.tone(color);
  const name: IconName = isIconName(icon) ? icon : (DEFAULT_TRACKER_ICON as IconName);
  return (
    <View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: tone.soft },
      ]}
    >
      <MaterialCommunityIcons name={name} size={Math.round(size * 0.55)} color={tone.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
