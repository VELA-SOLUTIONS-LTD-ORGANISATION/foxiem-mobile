import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { TrackerColor } from '@/domain/types';
import { useTheme } from '@/theme';

import { Text } from './Text';

type CountKeyProps = {
  color: TrackerColor;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** `row`: tinted 52 pt key for Home; `hero`: solid 64 pt key; `minus`: quiet decrement key. */
  kind: 'row' | 'hero' | 'minus';
  /** Overrides the key size; keep it at 44 pt or more. */
  size?: number;
  label?: string;
  disabled?: boolean;
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
};

/** The physical-feeling key: compresses on press, never waits for animation to accept a tap. */
export function CountKey({
  color,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  kind,
  size: sizeOverride,
  label,
  disabled = false,
  reduceMotion = false,
  style,
  testID,
}: CountKeyProps) {
  const theme = useTheme();
  const tone = theme.tone(color);
  const [scale] = useState(() => new Animated.Value(1));

  const pressTo = (value: number) => {
    if (reduceMotion) {
      return;
    }
    Animated.spring(scale, { toValue: value, stiffness: 520, damping: 26, mass: 0.5, useNativeDriver: true }).start();
  };

  const size = Math.max(44, sizeOverride ?? (kind === 'row' ? theme.sizes.rowKey : theme.sizes.detailKey));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      onPressIn={() => pressTo(0.92)}
      onPressOut={() => pressTo(1)}
      hitSlop={kind === 'row' ? 6 : 0}
      style={[kind === 'hero' ? styles.heroOuter : null, style]}
    >
      {({ pressed }) => {
        const solid = kind === 'hero' || (kind === 'row' && pressed);
        const background =
          kind === 'minus'
            ? pressed
              ? theme.colors.lineStrong
              : theme.colors.sunken
            : solid
              ? tone.solid
              : tone.soft;
        const ink = kind === 'minus' ? theme.colors.ink : solid ? tone.onSolid : tone.ink;
        return (
          <Animated.View
            style={[
              styles.key,
              {
                minWidth: size,
                height: size,
                borderRadius: kind === 'row' ? theme.radius.md : theme.radius.lg,
                backgroundColor: background,
                opacity: disabled ? 0.4 : 1,
                transform: [{ scale }],
              },
              kind === 'hero' && styles.heroKey,
            ]}
          >
            {label ? (
              <Text variant="numberMetric" color={ink} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                {label}
              </Text>
            ) : (
              <Ionicons name={kind === 'minus' ? 'remove' : 'add'} size={kind === 'row' ? Math.round(size * 0.58) : 34} color={ink} />
            )}
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  heroOuter: {
    flex: 1,
  },
  heroKey: {
    width: '100%',
  },
});
