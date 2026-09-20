import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, type TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/buttons/AppButton';
import { AppInput } from '@/components/forms/AppInput';
import { BottomSheet } from '@/components/overlays/BottomSheet';
import { MAX_TOPIC_NAME_LENGTH, type TopicNameError } from '@/state/topics';
import { space } from '@/theme';

type TopicNameEditorProps = {
  visible: boolean;
  mode: 'create' | 'rename';
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => TopicNameError | null;
  onClose: () => void;
};

export function TopicNameEditor({
  visible,
  mode,
  value,
  onChangeText,
  onSubmit,
  onClose,
}: TopicNameEditorProps) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [error, setError] = useState<TopicNameError | null>(null);

  const errorMessage =
    error === 'required'
      ? t('topics.nameRequired')
      : error === 'tooLong'
        ? t('topics.nameTooLong')
        : error === 'limit'
          ? t('topics.limitReached')
          : error === 'reserved'
            ? t('topics.reservedName')
            : error === 'duplicate'
              ? t('topics.alreadyExists')
              : undefined;

  const close = () => {
    Keyboard.dismiss();
    setError(null);
    onClose();
  };

  const submit = () => {
    const nextError = onSubmit();
    setError(nextError);
  };

  return (
    <BottomSheet
      visible={visible}
      title={mode === 'rename' ? t('topics.rename') : t('topics.new')}
      keyboardAware
      compact
      showClose
      placement="top"
      onClose={close}
      onShow={() => {
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      }}
    >
      <View testID="topic-name-editor" style={styles.form}>
        <AppInput
          ref={inputRef}
          label={t('topics.name')}
          value={value}
          onChangeText={(next) => {
            setError(null);
            onChangeText(next);
          }}
          maxLength={MAX_TOPIC_NAME_LENGTH}
          autoCapitalize="sentences"
          autoCorrect={false}
          returnKeyType="done"
          errorMessage={errorMessage}
          ariaLabel={t('topics.name')}
          onSubmitEditing={submit}
        />
        <View style={styles.formActions}>
          <View style={styles.action}>
            <AppButton
              title={t('common.cancel')}
              variant="outline"
              labelColor="textPrimary"
              onPress={close}
            />
          </View>
          <View style={styles.action}>
            <AppButton
              title={mode === 'rename' ? t('common.save') : t('topics.create')}
              onPress={submit}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

export const TopicEditorSheet = TopicNameEditor;

const styles = StyleSheet.create({
  form: {
    gap: space[5],
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space[3],
  },
  action: {
    flex: 1,
    minWidth: 0,
  },
});
