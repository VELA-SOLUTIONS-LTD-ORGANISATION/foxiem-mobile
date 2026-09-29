import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, NumberField, Segmented, Sheet, Text, TextField, useToast } from '@/components';
import { TRACKER_LIMITS, type CountEvent, type Tracker } from '@/domain';
import { addDays, isSameDay, startOfDay } from '@/domain/periods';
import { formatDayWithWeekday, formatNumber, formatTime } from '@/format';
import { usePreferences, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

type EntrySheetProps = {
  tracker: Tracker;
  /** null = add a new entry. */
  event: CountEvent | null;
  visible: boolean;
  onClose: () => void;
};

type Picker = 'date' | 'time' | null;

function initialWhen(event: CountEvent | null): Date {
  return event ? new Date(event.createdAt) : new Date();
}

function notAfterNow(date: Date): Date {
  return date.getTime() > Date.now() ? new Date() : date;
}

export function EntrySheet(props: EntrySheetProps) {
  // Remount per entry so the form always starts from the entry being edited.
  return props.visible ? <EntryForm key={props.event?.id ?? 'new'} {...props} /> : null;
}

function EntryForm({ tracker, event, visible, onClose }: EntrySheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { language } = usePreferences();
  const store = useTrackerStore();
  const toast = useToast();
  const editable = !event || event.type === 'increment' || event.type === 'decrement';
  const [amount, setAmount] = useState<number>(event ? Math.abs(event.amount) || 1 : tracker.step);
  const [when, setWhen] = useState<Date>(() => initialWhen(event));
  const [note, setNote] = useState(event?.note ?? '');
  const [picker, setPicker] = useState<Picker>(null);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  const dayChoice = isSameDay(when, now) ? 'today' : isSameDay(when, addDays(now, -1)) ? 'yesterday' : 'other';

  const setDay = (day: Date) => {
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), when.getHours(), when.getMinutes());
    setWhen(notAfterNow(next));
    setError(null);
  };

  const onPicked = (mode: 'date' | 'time') => (pickerEvent: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setPicker(null);
    }
    if (pickerEvent.type === 'dismissed' || !selected) {
      return;
    }
    if (mode === 'date') {
      setDay(selected);
    } else {
      const next = new Date(when.getFullYear(), when.getMonth(), when.getDate(), selected.getHours(), selected.getMinutes());
      setWhen(next);
      setError(null);
    }
  };

  const save = () => {
    if (editable && amount < 1) {
      setError(t('entry.invalidAmount'));
      return;
    }
    if (when.getTime() > Date.now() + 60_000) {
      setError(t('entry.futureTime'));
      return;
    }
    const ok = event
      ? store.updateEntry(tracker.id, event.id, { amount: editable ? amount : undefined, at: when, note })
      : store.addEntry(tracker.id, { amount, at: when, note });
    if (!ok) {
      setError(t('common.saveFailed'));
      return;
    }
    onClose();
  };

  const remove = () => {
    if (!event) {
      return;
    }
    const removed = store.deleteEntry(tracker.id, event.id);
    onClose();
    if (removed) {
      toast.show({
        message: t('history.deleted'),
        action: { label: t('common.undo'), onPress: () => store.restoreEntry(tracker.id, removed) },
      });
    }
  };

  const tone = theme.tone(tracker.color);

  return (
    <Sheet
      visible={visible}
      title={event ? t('entry.editTitle') : t('entry.addTitle')}
      onClose={onClose}
      footer={
        <>
          <Button
            testID="entry-save"
            title={event ? t('common.save') : t('entry.addButton', { amount: formatNumber(amount, language) })}
            fill={{ background: tone.solid, label: tone.onSolid }}
            onPress={save}
          />
          {event ? (
            <Button testID="entry-delete" title={t('entry.delete')} variant="destructiveGhost" onPress={remove} />
          ) : null}
        </>
      }
    >
      {editable ? (
        <NumberField
          testID="entry-amount"
          label={t('entry.amount')}
          value={amount}
          onChange={(value) => {
            setAmount(value ?? 1);
            setError(null);
          }}
          min={1}
          max={TRACKER_LIMITS.entryAmountMax}
          step={tracker.step}
          suffix={tracker.unit ?? undefined}
        />
      ) : (
        <Text variant="body" tone="inkSecondary">
          {event?.type === 'reset' ? t('entry.resetEntry') : t('entry.adjustEntry')}
        </Text>
      )}

      <View style={styles.block}>
        <Text variant="label" tone="inkSecondary">
          {t('entry.when')}
        </Text>
        <Segmented
          accessibilityLabel={t('entry.date')}
          value={dayChoice}
          onChange={(choice) => {
            if (choice === 'today') {
              setDay(new Date());
            } else if (choice === 'yesterday') {
              setDay(addDays(startOfDay(new Date()), -1));
            } else {
              setPicker('date');
            }
          }}
          options={[
            { value: 'today', label: t('common.today') },
            { value: 'yesterday', label: t('common.yesterday') },
            { value: 'other', label: t('entry.pickDate') },
          ]}
        />
        <View style={styles.pickRow}>
          <PickButton
            icon="calendar-outline"
            label={t('entry.date')}
            value={formatDayWithWeekday(when, language, now)}
            onPress={() => setPicker(picker === 'date' ? null : 'date')}
            grow={3}
          />
          <PickButton
            icon="time-outline"
            label={t('entry.time')}
            value={formatTime(when, language)}
            onPress={() => setPicker(picker === 'time' ? null : 'time')}
            grow={2}
          />
        </View>
        {picker ? (
          <DateTimePicker
            value={when}
            mode={picker}
            maximumDate={picker === 'date' ? new Date() : undefined}
            display={Platform.OS === 'ios' ? (picker === 'date' ? 'inline' : 'spinner') : 'default'}
            themeVariant={theme.scheme}
            onChange={onPicked(picker)}
          />
        ) : null}
      </View>

      <TextField
        label={`${t('entry.note')} · ${t('common.optional')}`}
        value={note}
        onChangeText={setNote}
        placeholder={t('entry.notePlaceholder')}
        maxLength={TRACKER_LIMITS.eventNoteMaxLength}
        multiline
      />

      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="assertive">
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}

function PickButton({
  icon,
  label,
  value,
  onPress,
  grow,
}: {
  icon: 'calendar-outline' | 'time-outline';
  label: string;
  value: string;
  onPress: () => void;
  grow: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pick,
        {
          flex: grow,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.line,
          backgroundColor: pressed ? theme.colors.sunken : theme.colors.surface,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.inkSecondary} />
      <Text variant="bodyStrong" numberOfLines={1} style={styles.pickValue}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 10,
  },
  pickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pick: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickValue: {
    flexShrink: 1,
  },
});
