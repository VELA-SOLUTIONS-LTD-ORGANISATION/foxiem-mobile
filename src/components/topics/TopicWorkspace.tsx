import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/feedback/Toast';
import { HomeTopicSwitcher } from '@/components/home/HomeTopicSwitcher';
import { useResponsiveLayout } from '@/hooks';
import { useAppState } from '@/state';
import { getTopicDisplayName, MAX_TOPIC_COUNT, type TopicNameError } from '@/state/topics';
import { useTopicOverlay } from '@/state/useTopicOverlay';
import { space } from '@/theme';

import { TopicContextSelector } from './TopicContextSelector';
import { TopicNameEditor } from './TopicNameEditor';
import { TopicPickerSheet } from './TopicPickerSheet';

type TopicWorkspaceProps = {
  variant: 'home' | 'compact';
};

export function TopicWorkspace({ variant }: TopicWorkspaceProps) {
  const { t } = useTranslation();
  const { topics, activeTopic, selectTopic, createTopic, renameTopic } = useAppState();
  const { isCompact } = useResponsiveLayout();
  const { showToast } = useToast();
  const { overlay, close, openPicker, openCreate, openRename } = useTopicOverlay();
  const [draft, setDraft] = useState('');

  const activeName = getTopicDisplayName(activeTopic, (key) => t(key));
  const canCreateTopic = topics.length < MAX_TOPIC_COUNT;
  const selectorLabel = t('topics.selectA11y', { topic: activeName });

  const showError = (error: TopicNameError | null) => {
    if (!error) {
      return;
    }
    const key =
      error === 'required'
        ? 'topics.nameRequired'
        : error === 'tooLong'
          ? 'topics.nameTooLong'
          : error === 'limit'
            ? 'topics.limitReached'
            : error === 'reserved'
              ? 'topics.reservedName'
              : 'topics.alreadyExists';
    showToast({ type: 'error', title: t(key) });
  };

  const closeOverlay = () => {
    Keyboard.dismiss();
    setDraft('');
    close();
  };

  const requestCreate = () => {
    if (!canCreateTopic) {
      showError('limit');
      return;
    }
    Keyboard.dismiss();
    setDraft('');
    openCreate();
  };

  const submitEditor = (): TopicNameError | null => {
    if (overlay.type === 'rename') {
      const result = renameTopic(overlay.topicId, draft);
      if (result.error) {
        showError(result.error);
        return result.error;
      }
      closeOverlay();
      return null;
    }

    const result = createTopic(draft);
    if (result.error) {
      showError(result.error);
      return result.error;
    }
    closeOverlay();
    return null;
  };

  return (
    <View
      testID={`topic-workspace-${variant}`}
      accessibilityValue={{ text: overlay.type }}
      style={variant === 'home' ? styles.home : styles.compact}
    >
      {variant === 'home' ? (
        <HomeTopicSwitcher
          topicName={activeName}
          activeLabel={t('topics.activeTopic')}
          canCreateTopic={canCreateTopic}
          selectorAccessibilityLabel={selectorLabel}
          addAccessibilityLabel={t('topics.add')}
          compact={isCompact}
          onPressTopic={openPicker}
          onPressAdd={requestCreate}
        />
      ) : (
        <TopicContextSelector
          topicName={activeName}
          accessibilityLabel={selectorLabel}
          onPress={openPicker}
        />
      )}

      {overlay.type === 'picker' ? (
        <TopicPickerSheet
          visible
          topics={topics}
          activeTopicId={activeTopic.id}
          onSelect={(topicId) => {
            selectTopic(topicId);
            closeOverlay();
          }}
          onRename={(topicId, name) => {
            setDraft(name);
            openRename(topicId);
          }}
          onRequestClose={closeOverlay}
        />
      ) : null}

      {overlay.type === 'create' || overlay.type === 'rename' ? (
        <TopicNameEditor
          key={overlay.type === 'rename' ? overlay.topicId : 'create'}
          visible
          mode={overlay.type}
          value={draft}
          onChangeText={setDraft}
          onSubmit={submitEditor}
          onClose={closeOverlay}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    width: '100%',
    marginTop: space[1],
  },
  compact: {
    width: '100%',
    marginTop: space[2],
    marginBottom: space[3],
    alignItems: 'center',
  },
});
