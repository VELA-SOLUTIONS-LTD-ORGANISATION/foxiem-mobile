import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppButton,
  AppText,
  BottomSheet,
  Card,
  Chip,
  ConfirmDialog,
  ProfileStackScreen,
  TextButton,
  useToast,
} from '@/components';
import type { MainStackScreenProps } from '@/navigation/types';
import {
  DEFAULT_REMINDER_TIME,
  EVERY_DAY,
  REMINDER_MESSAGE_KEYS,
  daysForPreset,
  formatTimeString,
  getRepeatPreset,
  parseTimeString,
  useAppState,
  type ReminderDay,
  type ReminderMessageKey,
  type RepeatPreset,
} from '@/state';
import { colors, radius, sizes, space } from '@/theme';

type AddProps = MainStackScreenProps<'AddReminder'>;
type EditProps = MainStackScreenProps<'EditReminder'>;

type SelectableRepeatPreset = Exclude<RepeatPreset, 'custom'>;

const PRESET_LABEL_KEYS = {
  everyDay: 'reminders.everyDay',
  weekdays: 'reminders.weekdays',
  weekends: 'reminders.weekends',
} as const satisfies Record<SelectableRepeatPreset, string>;

const SELECTABLE_PRESETS = Object.keys(PRESET_LABEL_KEYS) as SelectableRepeatPreset[];

const MESSAGE_LABEL_KEYS = {
  'notifications.messages.daily': 'notifications.presets.daily',
  'notifications.messages.momentum': 'notifications.presets.momentum',
  'notifications.messages.progress': 'notifications.presets.progress',
} as const;

function dateFromTime(time: string): Date {
  const parsed = parseTimeString(time) ?? parseTimeString(DEFAULT_REMINDER_TIME);
  const date = new Date();
  if (parsed) {
    date.setHours(parsed.hour, parsed.minute, 0, 0);
  }
  return date;
}

function normalizeDays(days: ReminderDay[]): ReminderDay[] {
  return getRepeatPreset(days) === 'custom' ? [...EVERY_DAY] : [...days];
}

export function AddReminderScreen({ navigation }: AddProps) {
  return <ReminderEditor mode="add" onClose={() => navigation.goBack()} />;
}

export function EditReminderScreen({ navigation, route }: EditProps) {
  const { reminders } = useAppState();
  const exists = reminders.some((item) => item.id === route.params.reminderId);

  useEffect(() => {
    if (!exists) {
      navigation.goBack();
    }
  }, [exists, navigation]);

  if (!exists) {
    return null;
  }

  return (
    <ReminderEditor
      mode="edit"
      reminderId={route.params.reminderId}
      onClose={() => navigation.goBack()}
    />
  );
}

function ReminderEditor({
  mode,
  reminderId,
  onClose,
}: {
  mode: 'add' | 'edit';
  reminderId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { reminders, addReminder, updateReminder, deleteReminder } = useAppState();
  const existing = reminderId ? reminders.find((item) => item.id === reminderId) : undefined;

  const [time, setTime] = useState(existing?.time ?? DEFAULT_REMINDER_TIME);
  const [days, setDays] = useState<ReminderDay[]>(
    normalizeDays(existing?.days ?? [...EVERY_DAY]),
  );
  const [messageKey, setMessageKey] = useState<ReminderMessageKey>(
    existing?.messageKey ?? 'notifications.messages.daily',
  );
  const [sheetPickerVisible, setSheetPickerVisible] = useState(false);
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const [draftTime, setDraftTime] = useState(time);
  const [permissionVisible, setPermissionVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const preset = useMemo(() => getRepeatPreset(days), [days]) as SelectableRepeatPreset;
  const usesAndroidDialog = Platform.OS === 'android';

  const openTimePicker = () => {
    if (usesAndroidDialog) {
      setAndroidPickerVisible(true);
      return;
    }
    setDraftTime(time);
    setSheetPickerVisible(true);
  };

  const onAndroidTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    setAndroidPickerVisible(false);
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    setTime(formatTimeString(selected.getHours(), selected.getMinutes()));
  };

  const onSheetDraftChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) {
      return;
    }
    setDraftTime(formatTimeString(selected.getHours(), selected.getMinutes()));
  };

  const cancelSheetPicker = () => {
    setSheetPickerVisible(false);
    setDraftTime(time);
  };

  const confirmSheetPicker = () => {
    setTime(draftTime);
    setSheetPickerVisible(false);
  };

  const selectPreset = (next: SelectableRepeatPreset) => {
    setDays(daysForPreset(next, days));
  };

  const save = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    const draft = { time, days, messageKey };
    try {
      const result =
        mode === 'edit' && reminderId
          ? await updateReminder(reminderId, draft)
          : await addReminder(draft);

      if (result.permission === 'denied') {
        setPermissionVisible(true);
        return;
      }

      if (!result.reminder) {
        showToast({ type: 'error', title: t('reminders.scheduleFailed') });
        return;
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileStackScreen
      title={mode === 'edit' ? t('reminders.edit') : t('reminders.add')}
      keyboardAware
    >
      <Card variant="default" style={styles.section}>
        <AppText variant="label" color="textSecondary">
          {t('reminders.time')}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('reminders.time')}, ${time}`}
          accessibilityHint={t('reminders.changeTimeHint')}
          onPress={openTimePicker}
          style={({ pressed }) => [styles.timeRow, pressed && styles.timeRowPressed]}
        >
          <Ionicons name="time-outline" size={sizes.iconLg} color={colors.textSecondary} />
          <AppText variant="displayNumber" style={styles.timeValue}>
            {time}
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>

      <Card variant="default" style={styles.section}>
        <AppText variant="label" color="textSecondary">
          {t('reminders.repeat')}
        </AppText>
        <View style={styles.chips}>
          {SELECTABLE_PRESETS.map((key) => (
            <Chip
              key={key}
              label={t(PRESET_LABEL_KEYS[key])}
              selected={preset === key}
              onPress={() => selectPreset(key)}
            />
          ))}
        </View>
      </Card>

      <Card variant="default" style={styles.section}>
        <AppText variant="label" color="textSecondary">
          {t('reminders.message')}
        </AppText>
        <View style={styles.messageList}>
          {REMINDER_MESSAGE_KEYS.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: messageKey === key }}
              onPress={() => setMessageKey(key)}
              style={[styles.messageCard, messageKey === key && styles.messageCardSelected]}
            >
              <AppText variant="label">{t(MESSAGE_LABEL_KEYS[key])}</AppText>
              <AppText variant="caption" color="textSecondary">
                {t(key)}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Card>

      <AppButton
        title={t('reminders.save')}
        onPress={() => void save()}
        disabled={saving}
        loading={saving}
      />

      {mode === 'edit' && reminderId ? (
        <AppButton
          title={t('reminders.delete')}
          variant="destructive"
          onPress={() => setDeleteVisible(true)}
        />
      ) : null}

      {usesAndroidDialog && androidPickerVisible ? (
        <DateTimePicker
          value={dateFromTime(time)}
          mode="time"
          display="default"
          onChange={onAndroidTimeChange}
        />
      ) : null}

      <BottomSheet
        visible={sheetPickerVisible}
        title={t('reminders.selectTime')}
        onClose={cancelSheetPicker}
        scroll={false}
      >
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={dateFromTime(draftTime)}
            mode="time"
            display="spinner"
            themeVariant="light"
            style={styles.picker}
            onChange={onSheetDraftChange}
          />
        </View>
        <View style={styles.pickerActions}>
          <TextButton title={t('common.cancel')} onPress={cancelSheetPicker} />
          <TextButton title={t('common.done')} onPress={confirmSheetPicker} />
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={permissionVisible}
        title={t('notifications.permission.title')}
        message={t('notifications.permission.body')}
        confirmLabel={t('notifications.permission.openSettings')}
        cancelLabel={t('common.cancel')}
        onCancel={() => {
          setPermissionVisible(false);
          onClose();
        }}
        onConfirm={() => {
          setPermissionVisible(false);
          void Linking.openSettings();
          onClose();
        }}
      />

      <ConfirmDialog
        visible={deleteVisible}
        title={t('reminders.deleteTitle')}
        message={t('reminders.deleteBody')}
        confirmLabel={t('reminders.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onCancel={() => setDeleteVisible(false)}
        onConfirm={async () => {
          if (reminderId) {
            await deleteReminder(reminderId);
          }
          setDeleteVisible(false);
          onClose();
        }}
      />
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space[3],
    padding: space[5],
  },
  timeRow: {
    minHeight: sizes.controlLg + space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  timeRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  timeValue: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  messageList: {
    gap: space[2],
  },
  messageCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: space[3] + 2,
    paddingHorizontal: space[4],
    gap: space[1],
  },
  messageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    maxHeight: 216,
  },
  picker: {
    width: '100%',
    height: 216,
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
