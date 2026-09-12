import { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppButton,
  Card,
  ConfirmDialog,
  EmptyState,
  ProfileStackScreen,
  SettingsRow,
} from '@/components';
import type { MainStackScreenProps } from '@/navigation/types';
import {
  getRepeatPreset,
  useAppState,
  type Reminder,
  type ReminderDay,
} from '@/state';
import { colors, space } from '@/theme';

type Props = MainStackScreenProps<'Reminders'>;

const WEEKDAY_LABEL_KEYS = {
  monday: 'calendar.weekdaysShort.monday',
  tuesday: 'calendar.weekdaysShort.tuesday',
  wednesday: 'calendar.weekdaysShort.wednesday',
  thursday: 'calendar.weekdaysShort.thursday',
  friday: 'calendar.weekdaysShort.friday',
  saturday: 'calendar.weekdaysShort.saturday',
  sunday: 'calendar.weekdaysShort.sunday',
} as const satisfies Record<ReminderDay, string>;

export function RemindersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { reminders, setReminderEnabled } = useAppState();
  const [permissionVisible, setPermissionVisible] = useState(false);
  const togglingRef = useRef<Set<string>>(new Set());

  const summarizeDays = (reminder: Reminder): string => {
    const preset = getRepeatPreset(reminder.days);
    if (preset === 'everyDay') {
      return t('reminders.everyDay');
    }
    if (preset === 'weekdays') {
      return t('reminders.weekdays');
    }
    if (preset === 'weekends') {
      return t('reminders.weekends');
    }

    return reminder.days.map((day) => t(WEEKDAY_LABEL_KEYS[day])).join(', ');
  };

  return (
    <ProfileStackScreen title={t('reminders.title')} subtitle={t('reminders.subtitle')}>
      {reminders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title={t('reminders.empty.title')}
            body={t('reminders.empty.body')}
            actionLabel={t('reminders.add')}
            onActionPress={() => navigation.navigate('AddReminder')}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <Card variant="default" style={styles.card}>
            {reminders.map((reminder, index) => {
              const daysLabel = summarizeDays(reminder);
              const statusLabel = reminder.enabled
                ? t('reminders.enabled')
                : t('reminders.disabled');

              return (
                <View key={reminder.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <SettingsRow
                    title={reminder.time}
                    subtitle={daysLabel}
                    toggleValue={reminder.enabled}
                    accessibilityLabel={`${reminder.time}, ${daysLabel}, ${t(reminder.messageKey)}, ${statusLabel}`}
                    onPress={() =>
                      navigation.navigate('EditReminder', { reminderId: reminder.id })
                    }
                    onToggleChange={(enabled) => {
                      if (togglingRef.current.has(reminder.id)) {
                        return;
                      }

                      togglingRef.current.add(reminder.id);
                      void (async () => {
                        try {
                          const result = await setReminderEnabled(reminder.id, enabled);
                          if (
                            enabled &&
                            (result.permission === 'denied' || result.reminder?.enabled === false)
                          ) {
                            setPermissionVisible(true);
                          }
                        } finally {
                          togglingRef.current.delete(reminder.id);
                        }
                      })();
                    }}
                  />
                </View>
              );
            })}
          </Card>
          <AppButton title={t('reminders.add')} onPress={() => navigation.navigate('AddReminder')} />
        </View>
      )}

      <ConfirmDialog
        visible={permissionVisible}
        title={t('notifications.permission.title')}
        message={t('notifications.permission.body')}
        confirmLabel={t('notifications.permission.openSettings')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setPermissionVisible(false)}
        onConfirm={() => {
          setPermissionVisible(false);
          void Linking.openSettings();
        }}
      />
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flexGrow: 1,
  },
  content: {
    gap: space[5],
  },
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
