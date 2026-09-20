import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/display/ListRow';
import { BottomSheet } from '@/components/overlays/BottomSheet';
import { getTopicDisplayName } from '@/state/topics';
import type { CounterTopic } from '@/state/types';
import { colors, sizes, space } from '@/theme';
import { formatLocaleNumber } from '@/utils/number';

type TopicPickerSheetProps = {
  visible: boolean;
  topics: readonly CounterTopic[];
  activeTopicId: string;
  onSelect: (topicId: string) => void;
  onRename: (topicId: string, name: string) => void;
  onRequestClose: () => void;
};

export function TopicPickerSheet({
  visible,
  topics,
  activeTopicId,
  onSelect,
  onRename,
  onRequestClose,
}: TopicPickerSheetProps) {
  const { t, i18n } = useTranslation();

  return (
    <BottomSheet visible={visible} title={t('topics.title')} onClose={onRequestClose}>
      <View testID="topic-picker-sheet" style={styles.sheetList}>
        {topics.map((topic) => {
          const name = getTopicDisplayName(topic, (key) => t(key));
          const selected = topic.id === activeTopicId;
          return (
            <View key={topic.id} style={styles.topicRow}>
              <View style={styles.topicChoice}>
                <ListRow
                  title={name}
                  value={formatLocaleNumber(topic.currentCount, i18n.language)}
                  selected={selected}
                  accessibilityLabel={name}
                  onPress={() => onSelect(topic.id)}
                />
              </View>
              {topic.kind === 'custom' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('topics.renameA11y', { topic: name })}
                  onPress={() => onRename(topic.id, topic.name ?? '')}
                  hitSlop={8}
                  style={styles.renameButton}
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetList: {
    gap: space[1],
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicChoice: {
    flex: 1,
    minWidth: 0,
  },
  renameButton: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
