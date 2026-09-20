import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, shadows, sizes, space } from '@/theme';
import { getHorizontalPadding, getLayoutRange } from '@/theme/layout';

export const HOME_TOPIC_SWITCHER_MAX_WIDTH = 390;
export const HOME_TOPIC_ADD_SIZE = 56;
export const HOME_TOPIC_ADD_SIZE_COMPACT = 52;
export const HOME_TOPIC_SELECTOR_MIN_HEIGHT = 64;
export const HOME_TOPIC_ICON_TILE = 43;
export const HOME_TOPIC_ROW_GAP = 10;

export function getHomeTopicSwitcherLayout(viewportWidth: number) {
  const horizontalPadding = getHorizontalPadding(viewportWidth);
  const contentWidth = Math.max(0, viewportWidth - horizontalPadding * 2);
  const rowWidth = Math.min(HOME_TOPIC_SWITCHER_MAX_WIDTH, contentWidth);
  const compact = getLayoutRange(viewportWidth) === 'compact';
  const addSize = compact ? HOME_TOPIC_ADD_SIZE_COMPACT : HOME_TOPIC_ADD_SIZE;
  const cardWidth = rowWidth - addSize - HOME_TOPIC_ROW_GAP;

  return {
    rowWidth,
    addSize,
    cardWidth,
    compact,
    fits: cardWidth >= 120 && addSize >= HOME_TOPIC_ADD_SIZE_COMPACT && rowWidth <= contentWidth,
  };
}

type HomeTopicSwitcherProps = {
  topicName: string;
  activeLabel: string;
  canCreateTopic: boolean;
  selectorAccessibilityLabel: string;
  addAccessibilityLabel: string;
  compact?: boolean;
  onPressTopic: () => void;
  onPressAdd: () => void;
};

export function HomeTopicSwitcher({
  topicName,
  activeLabel,
  canCreateTopic,
  selectorAccessibilityLabel,
  addAccessibilityLabel,
  compact = false,
  onPressTopic,
  onPressAdd,
}: HomeTopicSwitcherProps) {
  const addSize = compact ? HOME_TOPIC_ADD_SIZE_COMPACT : HOME_TOPIC_ADD_SIZE;

  return (
    <View style={styles.container}>
      <Pressable
        testID="home-topic-selector"
        accessibilityRole="button"
        accessibilityLabel={selectorAccessibilityLabel}
        onPress={onPressTopic}
        style={({ pressed }) => [styles.selector, pressed && styles.selectorPressed]}
      >
        <View style={styles.iconTile}>
          <Ionicons name="folder" size={21} color={colors.primary} />
        </View>

        <View style={styles.copy}>
          <AppText numberOfLines={1} ellipsizeMode="tail" weight="700" style={styles.topicName}>
            {topicName}
          </AppText>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <AppText
              numberOfLines={1}
              ellipsizeMode="tail"
              variant="captionSmall"
              color="textMuted"
              style={styles.activeLabel}
            >
              {activeLabel}
            </AppText>
          </View>
        </View>

        <Ionicons name="chevron-down" size={sizes.iconMd} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        testID="home-topic-add"
        accessibilityRole="button"
        accessibilityLabel={addAccessibilityLabel}
        accessibilityState={{ disabled: !canCreateTopic }}
        disabled={!canCreateTopic}
        onPress={onPressAdd}
        style={({ pressed }) => [
          styles.addButton,
          { width: addSize, height: addSize },
          pressed && canCreateTopic && styles.addButtonPressed,
          !canCreateTopic && styles.addButtonDisabled,
        ]}
      >
        <Ionicons name="add" size={compact ? 28 : 30} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: HOME_TOPIC_SWITCHER_MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: HOME_TOPIC_ROW_GAP,
  },
  selector: {
    flex: 1,
    minWidth: 0,
    minHeight: HOME_TOPIC_SELECTOR_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[3],
    paddingVertical: 8,
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  selectorPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  iconTile: {
    width: HOME_TOPIC_ICON_TILE,
    height: HOME_TOPIC_ICON_TILE,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginRight: space[3],
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  topicName: {
    fontSize: 17,
    lineHeight: 21,
  },
  statusRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  activeLabel: {
    flexShrink: 1,
  },
  addButton: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    ...shadows.sm,
  },
  addButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
});
