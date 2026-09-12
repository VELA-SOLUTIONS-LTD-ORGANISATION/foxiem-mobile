import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, ListRow, ProfileStackScreen } from '@/components';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import type { MainStackScreenProps } from '@/navigation/types';
import { useAppState } from '@/state';
import { colors, space } from '@/theme';

export function LanguageScreen(_props: MainStackScreenProps<'Language'>) {
  const { t } = useTranslation();
  const { preferences, changeLanguage } = useAppState();

  return (
    <ProfileStackScreen title={t('language.title')}>
      <Card variant="default" style={styles.card}>
        {SUPPORTED_LANGUAGES.map((language, index) => {
          const selected = language.code === preferences.language;

          return (
            <View key={language.code}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <ListRow
                title={language.label}
                chevron={false}
                selected={selected}
                onPress={() => {
                  void changeLanguage(language.code);
                }}
              />
            </View>
          );
        })}
      </Card>
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
  },
});
