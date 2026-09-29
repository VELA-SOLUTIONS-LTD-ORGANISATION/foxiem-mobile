import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Group, Header, Row, Screen, Section, Text, TrackerIcon } from '@/components';
import type { RootScreenProps } from '@/navigation/types';
import { usePreferences, useReminders, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

import { reminderSummary } from '../tracker/TrackerSettingsScreen';

export function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { language } = usePreferences();
  const reminders = useReminders();
  const { trackers } = useTrackerStore();
  const general = reminders.remindersFor(null);
  const trackerReminders = reminders.reminders.filter((reminder) => reminder.trackerId !== null);
  const blocked = reminders.permission === 'blocked' || reminders.permission === 'denied';

  return (
    <Screen>
      <Header title={t('notifications.title')} />
      <View style={styles.status}>
        {blocked ? (
          <Banner
            tone="caution"
            icon="notifications-off-outline"
            title={t('reminders.blockedTitle')}
            body={t('reminders.blockedBody')}
            action={{ label: t('common.openSettings'), onPress: () => void Linking.openSettings() }}
          />
        ) : (
          <Group>
            <Row
              title={t('notifications.status')}
              subtitle={reminders.permission === 'undetermined' ? t('notifications.statusHint') : undefined}
              value={reminders.permission === 'granted' ? t('notifications.statusGranted') : t('notifications.statusUndetermined')}
              leading={<Ionicons name="notifications-outline" size={22} color={theme.colors.ink} />}
            />
          </Group>
        )}
      </View>

      <Section title={t('notifications.checkIns')} description={t('notifications.checkInsBody')}>
        <Group>
          {general.map((reminder) => (
            <Row
              key={reminder.id}
              title={reminderSummary(reminder, t, language)}
              subtitle={reminder.messageKey ? t('notifications.legacy') : undefined}
              switchValue={reminder.enabled}
              onSwitch={(enabled) => void reminders.setEnabled(reminder.id, enabled)}
              onPress={() => navigation.navigate('ReminderEditor', { trackerId: null, reminderId: reminder.id })}
            />
          ))}
          {reminders.canAdd(null) ? (
            <Row
              title={t('notifications.addCheckIn')}
              leading={<Ionicons name="add-circle-outline" size={22} color={theme.colors.ink} />}
              onPress={() => navigation.navigate('ReminderEditor', { trackerId: null })}
            />
          ) : null}
        </Group>
      </Section>

      <Section title={t('notifications.trackerReminders')} description={t('notifications.trackerRemindersBody')}>
        {trackerReminders.length === 0 ? (
          <Text variant="body" tone="inkSecondary">
            {t('notifications.noTrackerReminders')}
          </Text>
        ) : (
          <Group inset={68}>
            {trackerReminders.map((reminder) => {
              const tracker = trackers.find((item) => item.id === reminder.trackerId);
              if (!tracker) {
                return null;
              }
              return (
                <Row
                  key={reminder.id}
                  title={tracker.name}
                  subtitle={reminderSummary(reminder, t, language)}
                  leading={<TrackerIcon icon={tracker.icon} color={tracker.color} size={36} />}
                  switchValue={reminder.enabled}
                  onSwitch={(enabled) => void reminders.setEnabled(reminder.id, enabled)}
                  onPress={() => navigation.navigate('ReminderEditor', { trackerId: tracker.id, reminderId: reminder.id })}
                />
              );
            })}
          </Group>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: {
    marginTop: 12,
  },
});
