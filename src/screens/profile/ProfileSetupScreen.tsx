import { useEffect } from 'react';
import { BackHandler, Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, ProfileForm, Screen, useToast } from '@/components';
import { FOXIEM_LOGO } from '@/constants/brand';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppState } from '@/state';
import { colors, radius, sizes, space } from '@/theme';

type Props = RootStackScreenProps<'ProfileSetup'>;

export function ProfileSetupScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { completeSetup } = useAppState();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  return (
    <Screen
      scroll
      constrained
      keyboardAware
      maxWidth={520}
      backgroundColor={colors.background}
      contentStyle={styles.screenFill}
      scrollContentStyle={styles.scrollFill}
    >
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.mascotWrap}>
            <Image
              source={FOXIEM_LOGO}
              style={styles.mascot}
              resizeMode="contain"
              alt={t('profileSetup.mascotAlt')}
            />
          </View>
          <AppText variant="h2" align="center">
            {t('profileSetup.title')}
          </AppText>
          <AppText variant="caption" color="textSecondary" align="center" style={styles.subtitle}>
            {t('profileSetup.subtitle')}
          </AppText>
        </View>

        <ProfileForm
          submitLabel={t('common.continue')}
          onSubmit={async (values) => {
            try {
              await completeSetup(values);
              navigation.replace('Main', { screen: 'Tabs', params: { screen: 'HomeTab' } });
            } catch {
              showToast({ type: 'error', title: t('common.saveFailed') });
            }
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenFill: {
    flexGrow: 1,
  },
  scrollFill: {
    flexGrow: 1,
  },
  container: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: space[6],
    gap: space[8],
  },
  brand: {
    alignItems: 'center',
    gap: space[3],
  },
  mascotWrap: {
    width: sizes.avatarXl + space[2],
    height: sizes.avatarXl + space[2],
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginBottom: space[2],
  },
  mascot: {
    width: '92%',
    height: '92%',
  },
  subtitle: {
    maxWidth: 320,
  },
});
