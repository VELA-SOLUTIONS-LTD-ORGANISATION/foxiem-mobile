import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Group, Header, ProBadge, Row, Screen, Section, Text, TrackerIcon } from '@/components';
import { withQuietTime } from '@/domain/quietHours';
import { parseTimeString } from '@/domain/reminders';
import { formatTime } from '@/format';
import type { RootScreenProps } from '@/navigation/types';
import { useFeature } from '@/pro/useFeature';
import { usePreferences, useReminders, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

import { reminderSummary } from '../tracker/TrackerSettingsScreen';

function clockDate(time: string): Date {
  const parsed = parseTimeString(time);
  const date = new Date();
  date.setHours(parsed?.hour ?? 0, parsed?.minute ?? 0, 0, 0);
  return date;
}

function QuietHoursSection() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { preferences, update, language } = usePreferences();
  const feature = useFeature('quietHours');
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);
  const quiet = preferences.quietHours;

  // A lapsed subscriber keeps a window they already set (and can switch it off); a new one needs Pro.
  if (!feature.visible && !quiet.enabled) {
    return null;
  }
  const canEdit = feature.allowed;
  const save = (next: typeof quiet) => void update({ quietHours: next });
  const onPick = (event: DateTimePickerEvent, selected?: Date) => {
    const edge = editing;
    if (Platform.OS === 'android') {
      setEditing(null);
    }
    if (event.type === 'dismissed' || !selected || !edge) {
      return;
    }
    save(withQuietTime(quiet, edge, selected.getHours(), selected.getMinutes()));
  };

  return (
    <Section title={t('notifications.quiet.title')} description={t('notifications.quiet.body')}>
      <Group>
        {canEdit || quiet.enabled ? (
          <Row
            testID="quiet-toggle"
            title={t('notifications.quiet.toggle')}
            switchValue={quiet.enabled}
            onSwitch={(enabled) => {
              if (enabled && !canEdit) {
                feature.request();
                return;
              }
              save({ ...quiet, enabled });
            }}
          />
        ) : (
          <Row
            title={t('notifications.quiet.toggle')}
            subtitle={t('notifications.quiet.proHint')}
            trailing={<ProBadge small />}
            onPress={feature.request}
          />
        )}
        {quiet.enabled ? (
          <Row
            testID="quiet-start"
            title={t('notifications.quiet.from')}
            value={formatTime(clockDate(quiet.start), language)}
            disabled={!canEdit}
            accessibilityHint={t('notifications.quiet.changeHint')}
            onPress={() => setEditing(editing === 'start' ? null : 'start')}
          />
        ) : null}
        {quiet.enabled ? (
          <Row
            testID="quiet-end"
            title={t('notifications.quiet.to')}
            value={formatTime(clockDate(quiet.end), language)}
            disabled={!canEdit}
            accessibilityHint={t('notifications.quiet.changeHint')}
            onPress={() => setEditing(editing === 'end' ? null : 'end')}
          />
        ) : null}
      </Group>
      {editing && quiet.enabled ? (
        <DateTimePicker
          value={clockDate(editing === 'start' ? quiet.start : quiet.end)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant={theme.scheme}
          onChange={onPick}
        />
      ) : null}
    </Section>
  );
}

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

      <QuietHoursSection />

      <Section title={t('notifications.checkIns')} description={t('notifications.checkInsBody')}>
        <Group>
          {general.map((reminder) => (
            <Row
              key={reminder.id}
              title={reminderSummary(reminder, t, language)}
              subtitle={
                reminder.enabled && reminders.isQuiet(reminder)
                  ? t('reminders.quietNote')
                  : reminder.messageKey
                    ? t('notifications.legacy')
                    : undefined
              }
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
                  subtitle={
                    reminder.enabled && reminders.isQuiet(reminder)
                      ? `${reminderSummary(reminder, t, language)} · ${t('reminders.quietNote')}`
                      : reminderSummary(reminder, t, language)
                  }
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
