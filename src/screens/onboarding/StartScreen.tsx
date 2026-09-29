import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Group, Header, Row, Screen, Text, TrackerIcon } from '@/components';
import { TRACKER_TEMPLATES } from '@/domain';
import { describeGoal } from '@/format';
import type { RootScreenProps } from '@/navigation/types';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';

export function StartScreen({ navigation }: RootScreenProps<'Start'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { language } = usePreferences();

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <Button
          testID="start-custom"
          variant="secondary"
          title={t('start.custom')}
          icon={<Ionicons name="add" size={20} color={theme.colors.ink} />}
          onPress={() => navigation.navigate('CreateTracker', { firstRun: true })}
        />
      }
    >
      <Header />
      <Text variant="title" accessibilityRole="header">
        {t('start.title')}
      </Text>
      <Text variant="body" tone="inkSecondary" style={styles.subtitle}>
        {t('start.subtitle')}
      </Text>
      <View style={styles.list}>
        <Group inset={72}>
          {TRACKER_TEMPLATES.map((template) => {
            const unit = template.unitKey ? t(template.unitKey) : null;
            return (
              <Row
                key={template.id}
                testID={`template-${template.id}`}
                title={t(`start.templates.${template.id}` as 'start.templates.coffee')}
                subtitle={describeGoal({ ...template, unit }, t, language)}
                leading={<TrackerIcon icon={template.icon} color={template.color} />}
                onPress={() => navigation.navigate('CreateTracker', { templateId: template.id, firstRun: true })}
              />
            );
          })}
        </Group>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 8,
  },
  list: {
    marginTop: 20,
  },
});
