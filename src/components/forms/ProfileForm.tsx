import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/buttons/AppButton';
import { AppInput } from '@/components/forms/AppInput';
import type { UserProfile } from '@/state';
import { space } from '@/theme';
import {
  NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  validateProfileForm,
  type ProfileFormErrors,
} from '@/utils/profileValidation';

export type ProfileFormValues = UserProfile;

type ProfileFormProps = {
  initialValues?: ProfileFormValues;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => Promise<void> | void;
};

export function ProfileForm({
  initialValues,
  submitLabel,
  onSubmit,
}: ProfileFormProps) {
  const { t } = useTranslation();
  const usernameRef = useRef<TextInput>(null);
  const [name, setName] = useState(initialValues?.name ?? '');
  const [username, setUsername] = useState(initialValues?.username ?? '');
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const messages = {
    nameRequired: t('profileSetup.nameRequired'),
    nameTooLong: t('profileSetup.nameTooLong'),
    usernameRequired: t('profileSetup.usernameRequired'),
    usernameLength: t('profileSetup.usernameLength'),
    usernameChars: t('profileSetup.usernameChars'),
  };

  const submit = async () => {
    if (submitting) {
      return;
    }

    const values = {
      name: name.trim(),
      username: username.trim(),
    };
    const nextErrors = validateProfileForm(values, messages);
    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.username) {
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <AppInput
        label={t('profileSetup.name')}
        placeholder={t('profileSetup.namePlaceholder')}
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (errors.name) {
            setErrors((current) => ({ ...current, name: undefined }));
          }
        }}
        errorMessage={errors.name}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={NAME_MAX_LENGTH}
        returnKeyType="next"
        onSubmitEditing={() => usernameRef.current?.focus()}
      />
      <AppInput
        ref={usernameRef}
        label={t('profileSetup.username')}
        placeholder={t('profileSetup.usernamePlaceholder')}
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          if (errors.username) {
            setErrors((current) => ({ ...current, username: undefined }));
          }
        }}
        errorMessage={errors.username}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={USERNAME_MAX_LENGTH}
        returnKeyType="done"
        onSubmitEditing={() => {
          void submit();
        }}
      />
      <AppButton
        title={submitLabel}
        onPress={() => void submit()}
        disabled={submitting}
        loading={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    gap: space[4],
  },
});
