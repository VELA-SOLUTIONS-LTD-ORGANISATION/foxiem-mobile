import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, ProfileForm, ProfileStackScreen, useToast } from '@/components';
import type { MainStackScreenProps } from '@/navigation/types';
import { useAppState } from '@/state';
import { space } from '@/theme';

type Props = MainStackScreenProps<'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { profile, updateProfile } = useAppState();

  return (
    <ProfileStackScreen title={t('editProfile.title')} keyboardAware>
      <Card variant="default" style={styles.card}>
        <ProfileForm
          initialValues={profile ?? { name: '', username: '' }}
          submitLabel={t('editProfile.saveChanges')}
          onSubmit={async (values) => {
            try {
              await updateProfile(values);
              navigation.goBack();
            } catch {
              showToast({ type: 'error', title: t('common.saveFailed') });
            }
          }}
        />
      </Card>
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[2],
  },
});
