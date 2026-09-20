import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, shadows, sizes, space } from '@/theme';

type TopicContextSelectorProps = {
  topicName: string;
  accessibilityLabel: string;
  onPress: () => void;
};

export function TopicContextSelector({
  topicName,
  accessibilityLabel,
  onPress,
}: TopicContextSelectorProps) {
  return (
    <Pressable
      testID="compact-topic-selector"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
    >
      <AppText variant="label" weight="600" numberOfLines={1} ellipsizeMode="tail" style={styles.name}>
        {topicName}
      </AppText>
      <Ionicons name="chevron-down" size={sizes.iconMd} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  selector: {
    alignSelf: 'center',
    maxWidth: '100%',
    minHeight: sizes.controlMd,
    minWidth: 0,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    ...shadows.sm,
  },
  name: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
