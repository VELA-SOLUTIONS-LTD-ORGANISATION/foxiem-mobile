import { StyleSheet, View } from 'react-native';

import { colors, radius, space, type ColorToken } from '@/theme';

type LinearProgressProps = {
  progress: number;
  color?: Extract<ColorToken, 'primary' | 'success' | 'warning' | 'error'>;
  height?: number;
};

export function LinearProgress({
  progress,
  color = 'primary',
  height = space[2],
}: LinearProgressProps) {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      style={[styles.track, { height, borderRadius: radius.pill }]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: colors[color],
            borderRadius: radius.pill,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceSecondary,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
