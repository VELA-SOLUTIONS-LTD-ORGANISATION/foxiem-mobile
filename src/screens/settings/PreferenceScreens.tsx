import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Group, Header, Row, Screen } from '@/components';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import type { RootScreenProps } from '@/navigation/types';
import { usePreferences } from '@/state';
import type { Appearance } from '@/storage';

export function LanguageScreen(_props: RootScreenProps<'Language'>) {
  const { t } = useTranslation();
  const { preferences, update } = usePreferences();
  return (
    <Screen>
      <Header title={t('language.title')} />
      <Group style={styles.group}>
        <Row
          title={t('language.device')}
          selected={preferences.language === null}
          onPress={() => void update({ language: null })}
        />
        {SUPPORTED_LANGUAGES.map((language) => (
          <Row
            key={language.code}
            title={language.label}
            selected={preferences.language === language.code}
            onPress={() => void update({ language: language.code })}
          />
        ))}
      </Group>
    </Screen>
  );
}

const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'];

export function AppearanceScreen(_props: RootScreenProps<'Appearance'>) {
  const { t } = useTranslation();
  const { preferences, update } = usePreferences();
  return (
    <Screen>
      <Header title={t('appearance.title')} />
      <Group style={styles.group}>
        {APPEARANCES.map((appearance) => (
          <Row
            key={appearance}
            title={t(`appearance.${appearance}`)}
            selected={preferences.appearance === appearance}
            onPress={() => void update({ appearance })}
          />
        ))}
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: 12,
  },
});
