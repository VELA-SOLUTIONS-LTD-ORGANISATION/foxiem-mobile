import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  Banner,
  Button,
  ConfirmDialog,
  Group,
  Header,
  ProBadge,
  Row,
  Screen,
  Section,
  Segmented,
  Text,
  useToast,
} from '@/components';
import {
  DEFAULT_REMINDER_TIME,
  EVERY_DAY,
  REMINDER_DAYS,
  WEEKDAY_DAYS,
  WEEKEND_DAYS,
  formatTimeString,
  parseTimeString,
  repeatPreset,
  usualLogTime,
  type ReminderDay,
} from '@/domain/reminders';
import { formatTime, weekdayName } from '@/format';
import type { RootScreenProps } from '@/navigation/types';
import { useFeature } from '@/pro/useFeature';
import { usePreferences, useReminders, useTracker } from '@/state';
import { useTheme } from '@/theme';

const DAY_INDEX: Record<ReminderDay, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function dateForTime(time: string): Date {
  const parsed = parseTimeString(time) ?? parseTimeString(DEFAULT_REMINDER_TIME)!;
  const date = new Date();
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date;
}

export function ReminderEditorScreen({ navigation, route }: RootScreenProps<'ReminderEditor'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const { language } = usePreferences();
  const reminders = useReminders();
  const smartFeature = useFeature('smartReminders');
  const { tracker, events } = useTracker(route.params.trackerId ?? '');
  const existing = route.params.reminderId
    ? reminders.reminders.find((item) => item.id === route.params.reminderId)
    : undefined;

  const [time, setTime] = useState(existing?.time ?? DEFAULT_REMINDER_TIME);
  const [days, setDays] = useState<ReminderDay[]>(existing?.days ?? [...EVERY_DAY]);
  const [smart, setSmart] = useState(existing?.smart ?? false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blockedDialog, setBlockedDialog] = useState(false);
  const [daysError, setDaysError] = useState(false);

  const suggestion = useMemo(
    () => (tracker && smartFeature.allowed ? usualLogTime(events.map((event) => event.createdAt), new Date()) : null),
    [events, smartFeature.allowed, tracker],
  );

  const permission = reminders.permission;
  const preset = repeatPreset(days);
  const title = tracker ? tracker.name : t('reminders.general');

  const toggleDay = (day: ReminderDay) => {
    setDaysError(false);
    setDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const onTime = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setPickerOpen(false);
    }
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    setTime(formatTimeString(selected.getHours(), selected.getMinutes()));
  };

  const save = async () => {
    if (days.length === 0) {
      setDaysError(true);
      return;
    }
    setSaving(true);
    try {
      const result = await reminders.save(
        { trackerId: route.params.trackerId, time, days, smart: smart && smartFeature.allowed },
        existing?.id,
      );
      if (result.status === 'limit') {
        toast.show({ message: t('reminders.limitReached') });
        return;
      }
      if (result.status === 'failed') {
        toast.show({ message: t('reminders.scheduleFailed') });
        return;
      }
      if (result.status === 'permission') {
        setBlockedDialog(true);
        return;
      }
      toast.show({ message: t('reminders.saved') });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) {
      return;
    }
    await reminders.remove(existing.id);
    toast.show({ message: t('reminders.deleted') });
    navigation.goBack();
  };

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <View style={styles.footer}>
          <Button testID="reminder-save" title={t('reminders.save')} loading={saving} onPress={() => void save()} />
          {existing ? <Button title={t('reminders.delete')} variant="destructiveGhost" onPress={() => void remove()} /> : null}
        </View>
      }
    >
      <Header title={existing ? t('reminders.title') : t('reminders.newTitle')} subtitle={title} />

      <View style={styles.banner}>
        {permission === 'blocked' || permission === 'denied' ? (
          <Banner
            tone="caution"
            icon="notifications-off-outline"
            title={t('reminders.blockedTitle')}
            body={t('reminders.blockedBody')}
            action={{ label: t('common.openSettings'), onPress: () => void Linking.openSettings() }}
          />
        ) : permission === 'undetermined' ? (
          <Banner icon="notifications-outline" title={t('reminders.permissionTitle')} body={t('reminders.permissionBody')} />
        ) : null}
      </View>

      <Section title={t('reminders.time')} style={styles.firstSection}>
        <Pressable
          testID="reminder-time"
          accessibilityRole="button"
          accessibilityLabel={`${t('reminders.time')}, ${formatTime(dateForTime(time), language)}`}
          accessibilityHint={t('reminders.changeTime')}
          onPress={() => setPickerOpen((open) => !open)}
          style={({ pressed }) => [
            styles.time,
            {
              borderRadius: theme.radius.lg,
              borderColor: theme.colors.line,
              backgroundColor: pressed ? theme.colors.sunken : theme.colors.surface,
            },
          ]}
        >
          <Ionicons name="time-outline" size={24} color={theme.colors.inkSecondary} />
          <Text variant="numberMetric" style={styles.timeValue}>
            {formatTime(dateForTime(time), language)}
          </Text>
          <Text variant="label" tone="inkSecondary">
            {t('reminders.changeTime')}
          </Text>
        </Pressable>
        {pickerOpen ? (
          <DateTimePicker
            value={dateForTime(time)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={theme.scheme}
            onChange={onTime}
          />
        ) : null}
        {reminders.isQuiet({ time }) ? (
          <Text variant="caption" tone="caution" accessibilityLiveRegion="polite" style={styles.quietWarning}>
            {t('reminders.quietNote')}
          </Text>
        ) : null}
        {suggestion && suggestion !== time ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setTime(suggestion)}
            style={({ pressed }) => [styles.suggestion, { borderRadius: theme.radius.md, backgroundColor: pressed ? theme.colors.lineStrong : theme.colors.sunken }]}
          >
            <Ionicons name="bulb-outline" size={18} color={theme.colors.ink} />
            <Text variant="caption" style={styles.suggestionText}>
              {t('reminders.suggested', { time: formatTime(dateForTime(suggestion), language) })}
            </Text>
            <Text variant="label">{t('reminders.useSuggested', { time: formatTime(dateForTime(suggestion), language) })}</Text>
          </Pressable>
        ) : null}
      </Section>

      <Section title={t('reminders.repeat')}>
        <Segmented
          accessibilityLabel={t('reminders.repeat')}
          value={preset === 'custom' ? 'custom' : preset}
          onChange={(value) => {
            setDaysError(false);
            if (value === 'everyDay') {
              setDays([...EVERY_DAY]);
            } else if (value === 'weekdays') {
              setDays([...WEEKDAY_DAYS]);
            } else if (value === 'weekends') {
              setDays([...WEEKEND_DAYS]);
            }
          }}
          options={[
            { value: 'everyDay', label: t('reminders.everyDay') },
            { value: 'weekdays', label: t('reminders.weekdays') },
            { value: 'weekends', label: t('reminders.weekends') },
          ]}
        />
        <View style={styles.days}>
          {REMINDER_DAYS.map((day) => {
            const selected = days.includes(day);
            const name = weekdayName(DAY_INDEX[day], language, 'long');
            return (
              <Pressable
                key={day}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={t('reminders.dayToggle', { day: name, state: selected ? t('reminders.selected') : t('reminders.notSelected') })}
                onPress={() => toggleDay(day)}
                style={[
                  styles.day,
                  {
                    borderRadius: theme.radius.md,
                    backgroundColor: selected ? theme.colors.ink : theme.colors.surface,
                    borderColor: selected ? theme.colors.ink : theme.colors.line,
                  },
                ]}
              >
                <Text variant="label" color={selected ? theme.colors.canvas : theme.colors.ink} maxFontSizeMultiplier={1.2}>
                  {weekdayName(DAY_INDEX[day], language, 'narrow')}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {daysError ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite" style={styles.daysError}>
            {t('reminders.daysRequired')}
          </Text>
        ) : null}
      </Section>

      {tracker && smartFeature.visible ? (
        <Section>
          <Group>
            {smartFeature.allowed ? (
              <Row title={t('reminders.smart')} subtitle={t('reminders.smartBody')} switchValue={smart} onSwitch={setSmart} />
            ) : (
              <Row
                title={t('reminders.smart')}
                subtitle={t('reminders.smartBody')}
                trailing={<ProBadge small />}
                onPress={smartFeature.request}
              />
            )}
          </Group>
        </Section>
      ) : null}

      <ConfirmDialog
        visible={blockedDialog}
        title={t('reminders.blockedTitle')}
        message={t('reminders.blockedBody')}
        confirmLabel={t('common.openSettings')}
        cancelLabel={t('common.notNow')}
        onCancel={() => {
          setBlockedDialog(false);
          navigation.goBack();
        }}
        onConfirm={() => {
          setBlockedDialog(false);
          void Linking.openSettings();
          navigation.goBack();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 4,
  },
  banner: {
    marginTop: 8,
  },
  firstSection: {
    marginTop: 16,
  },
  time: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timeValue: {
    flex: 1,
    fontSize: 32,
    lineHeight: 38,
  },
  suggestion: {
    marginTop: 10,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  suggestionText: {
    flex: 1,
  },
  days: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
  },
  day: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  daysError: {
    marginTop: 8,
  },
  quietWarning: {
    marginTop: 8,
  },
});
