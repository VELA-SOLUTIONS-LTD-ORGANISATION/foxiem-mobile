import { Ionicons } from '@expo/vector-icons';
import { CommonActions, usePreventRemove } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  Button,
  ConfirmDialog,
  Group,
  Header,
  NumberField,
  ProBadge,
  Row,
  Screen,
  Section,
  Text,
  TextField,
  useToast,
} from '@/components';
import {
  TRACKER_LIMITS,
  coerceDraftForIntent,
  draftFromTracker,
  runningValue,
  type TrackerDraft,
  type TrackerDraftError,
} from '@/domain';
import { repeatPreset, type Reminder } from '@/domain/reminders';
import { formatNumber, weekdayName } from '@/format';
import type { RootScreenProps } from '@/navigation/types';
import { useFeature } from '@/pro/useFeature';
import { usePreferences, useReminders, useTracker, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

import { AppearanceFields } from '../shared/AppearanceFields';
import { errorMessage, GoalFields } from '../shared/GoalFields';
import { INTENT_ICONS, IntentOptions } from '../shared/IntentOptions';

const NAME_ERRORS: readonly TrackerDraftError[] = ['nameRequired', 'nameTooLong', 'nameDuplicate'];
const DAY_INDEX: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

export function reminderSummary(reminder: Reminder, t: ReturnType<typeof useTranslation>['t'], locale: string): string {
  const preset = repeatPreset(reminder.days);
  const days =
    preset === 'everyDay'
      ? t('reminders.everyDay')
      : preset === 'weekdays'
        ? t('reminders.weekdays')
        : preset === 'weekends'
          ? t('reminders.weekends')
          : reminder.days.map((day) => weekdayName(DAY_INDEX[day]!, locale, 'short')).join(', ');
  return t('reminders.summary', { time: reminder.time, days });
}

export function TrackerSettingsScreen({ navigation, route }: RootScreenProps<'TrackerSettings'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { language } = usePreferences();
  const toast = useToast();
  const store = useTrackerStore();
  const reminders = useReminders();
  const multipleReminders = useFeature('multipleReminders');
  const { tracker, events } = useTracker(route.params.trackerId);
  const [draft, setDraft] = useState<TrackerDraft | null>(() => (tracker ? draftFromTracker(tracker) : null));
  const [error, setError] = useState<TrackerDraftError | null>(null);
  const [intentOpen, setIntentOpen] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'delete' | 'discard' | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<Parameters<typeof navigation.dispatch>[0] | null>(null);

  const dirty = Boolean(tracker && draft && JSON.stringify(draftFromTracker(tracker)) !== JSON.stringify(draft));

  usePreventRemove(dirty && !leaving, ({ data }) => {
    setPendingAction(data.action);
    setConfirm('discard');
  });

  if (!tracker || !draft) {
    return (
      <Screen>
        <Header />
      </Screen>
    );
  }

  const update = (patch: Partial<TrackerDraft>) => {
    setError(null);
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  /** Navigate only after the "leaving" state has committed, so the unsaved-changes guard lets go. */
  const leave = (toHome: boolean) => {
    setLeaving(true);
    setTimeout(() => {
      if (toHome) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'HomeTab' } }] }));
      } else {
        navigation.goBack();
      }
    }, 0);
  };

  const save = () => {
    const result = store.updateTracker(tracker.id, draft);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.show({ message: t('trackerSettings.saved') });
    leave(false);
  };

  const trackerReminders = reminders.remindersFor(tracker.id);
  const running = runningValue(tracker, events);
  const canAdd = reminders.canAdd(tracker.id);

  return (
    <Screen
      keyboard
      edges={['top', 'bottom', 'left', 'right']}
      footer={<Button testID="settings-save" title={t('common.saveChanges')} disabled={!dirty} onPress={save} />}
    >
      <Header title={t('trackerSettings.title')} subtitle={tracker.name} />

      <Section title={t('trackerSettings.basics')} style={styles.firstSection}>
        <View style={styles.stack}>
          <TextField
            testID="settings-name"
            label={t('create.nameLabel')}
            value={draft.name}
            maxLength={TRACKER_LIMITS.nameMaxLength + 5}
            onChangeText={(name) => update({ name })}
            error={error && NAME_ERRORS.includes(error) ? errorMessage(error, t) : undefined}
          />
          <AppearanceFields icon={draft.icon} color={draft.color} onChange={update} />
        </View>
      </Section>

      <Section title={t('trackerSettings.purpose')} description={t('trackerSettings.intentChangeNote')}>
        <View style={styles.stack}>
          {intentOpen ? (
            <IntentOptions
              value={draft.intent}
              onSelect={(intent) => {
                setDraft((current) => (current ? coerceDraftForIntent(current, intent) : current));
                setIntentOpen(false);
              }}
            />
          ) : (
            <Pressable
              testID="settings-intent"
              accessibilityRole="button"
              accessibilityLabel={`${t(`intents.${draft.intent}.title`)}. ${t('trackerSettings.changeIntent')}`}
              onPress={() => setIntentOpen(true)}
              style={({ pressed }) => [
                styles.intentRow,
                {
                  borderRadius: theme.radius.lg,
                  borderColor: theme.colors.line,
                  backgroundColor: pressed ? theme.colors.sunken : theme.colors.surface,
                },
              ]}
            >
              <Ionicons name={INTENT_ICONS[draft.intent]} size={22} color={theme.colors.ink} />
              <View style={styles.intentCopy}>
                <Text variant="bodyStrong">{t(`intents.${draft.intent}.title`)}</Text>
                <Text variant="caption" tone="inkSecondary">
                  {t(`intents.${draft.intent}.body`)}
                </Text>
              </View>
              <Text variant="label" tone="inkSecondary">
                {t('trackerSettings.changeIntent')}
              </Text>
            </Pressable>
          )}
          <GoalFields draft={draft} onChange={update} error={error} />
        </View>
      </Section>

      <Section title={t('trackerSettings.counting')}>
        <View style={styles.stack}>
          <NumberField
            label={t('create.step')}
            value={draft.step}
            onChange={(value) => update({ step: value ?? 1 })}
            min={1}
            max={TRACKER_LIMITS.stepMax}
            error={error === 'stepRange' ? errorMessage(error, t) : undefined}
          />
          {draft.intent !== 'reach' && draft.intent !== 'limit' ? (
            <TextField
              label={`${t('create.unit')} · ${t('common.optional')}`}
              value={draft.unit ?? ''}
              onChangeText={(unit) => update({ unit })}
              placeholder={t('create.unitPlaceholder')}
              maxLength={TRACKER_LIMITS.unitMaxLength}
              autoCapitalize="none"
            />
          ) : null}
          {draft.period === 'all' ? (
            <NumberField
              label={t('create.startingValue')}
              value={draft.startingValue}
              onChange={(value) => update({ startingValue: value ?? 0 })}
              min={0}
              max={TRACKER_LIMITS.startingValueMax}
              hint={t('create.startingValueHint')}
            />
          ) : null}
        </View>
      </Section>

      <Section title={t('trackerSettings.reminders')}>
        <Group>
          {trackerReminders.map((reminder) => {
            const active = reminders.isActive(reminder);
            const paused = reminder.enabled && !active && tracker.archivedAt === null;
            return (
              <Row
                key={reminder.id}
                title={reminderSummary(reminder, t, language)}
                subtitle={paused ? t('trackerSettings.reminderPaused') : reminder.smart ? t('reminders.smart') : undefined}
                onPress={() => navigation.navigate('ReminderEditor', { trackerId: tracker.id, reminderId: reminder.id })}
                switchValue={reminder.enabled}
                onSwitch={(enabled) => void reminders.setEnabled(reminder.id, enabled)}
                accessibilityLabel={reminderSummary(reminder, t, language)}
              />
            );
          })}
          {canAdd ? (
            <Row
              testID="settings-add-reminder"
              title={t('trackerSettings.addReminder')}
              leading={<Ionicons name="alarm-outline" size={22} color={theme.colors.ink} />}
              onPress={() => navigation.navigate('ReminderEditor', { trackerId: tracker.id })}
            />
          ) : multipleReminders.visible && !multipleReminders.allowed ? (
            <Row
              title={t('trackerSettings.moreRemindersPro')}
              leading={<Ionicons name="alarm-outline" size={22} color={theme.colors.inkSecondary} />}
              trailing={<ProBadge small />}
              onPress={multipleReminders.request}
            />
          ) : null}
        </Group>
      </Section>

      <Section title={t('trackerSettings.notes')}>
        <TextField
          label={t('trackerSettings.notes')}
          hideLabel
          value={draft.notes}
          onChangeText={(notes) => update({ notes })}
          placeholder={t('create.notesPlaceholder')}
          multiline
          maxLength={TRACKER_LIMITS.notesMaxLength}
        />
      </Section>

      <Section title={t('trackerSettings.manage')}>
        <Group>
          {tracker.period === 'all' && running > 0 ? (
            <Row
              testID="settings-reset"
              title={t('trackerSettings.resetCount')}
              subtitle={formatNumber(running, language)}
              leading={<Ionicons name="refresh" size={22} color={theme.colors.ink} />}
              onPress={() => setConfirm('reset')}
            />
          ) : null}
          {tracker.archivedAt === null ? (
            <Row
              testID="settings-archive"
              title={t('trackerSettings.archive')}
              subtitle={t('trackerSettings.archiveHint')}
              leading={<Ionicons name="archive-outline" size={22} color={theme.colors.ink} />}
              onPress={() => {
                store.archiveTracker(tracker.id);
                toast.show({
                  message: t('trackerSettings.archived', { name: tracker.name }),
                  action: { label: t('common.undo'), onPress: () => store.restoreTracker(tracker.id) },
                });
                leave(true);
              }}
            />
          ) : null}
          <Row
            testID="settings-delete"
            title={t('trackerSettings.delete')}
            destructive
            leading={<Ionicons name="trash-outline" size={22} color={theme.colors.danger} />}
            onPress={() => setConfirm('delete')}
          />
        </Group>
      </Section>

      <ConfirmDialog
        visible={confirm === 'reset'}
        title={t('trackerSettings.resetTitle', { name: tracker.name })}
        message={t('trackerSettings.resetBody')}
        confirmLabel={t('trackerSettings.resetCount')}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          store.resetTracker(tracker.id);
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        visible={confirm === 'delete'}
        destructive
        title={t('trackerSettings.deleteTitle', { name: tracker.name })}
        message={t('trackerSettings.deleteBody', { count: events.length })}
        confirmLabel={t('trackerSettings.deleteConfirm')}
        secondary={
          tracker.archivedAt === null
            ? {
                label: t('trackerSettings.archive'),
                onPress: () => {
                  setConfirm(null);
                  store.archiveTracker(tracker.id);
                  leave(true);
                },
              }
            : undefined
        }
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          await Promise.all(trackerReminders.map((reminder) => reminders.remove(reminder.id)));
          store.deleteTracker(tracker.id);
          leave(true);
        }}
      />
      <ConfirmDialog
        visible={confirm === 'discard'}
        title={t('trackerSettings.unsavedTitle')}
        message={t('trackerSettings.unsavedBody')}
        confirmLabel={t('trackerSettings.discard')}
        destructive
        onCancel={() => {
          setConfirm(null);
          setPendingAction(null);
        }}
        onConfirm={() => {
          setConfirm(null);
          setLeaving(true);
          const action = pendingAction;
          setTimeout(() => {
            if (action) {
              navigation.dispatch(action);
            }
          }, 0);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  firstSection: {
    marginTop: 12,
  },
  stack: {
    gap: 20,
  },
  intentRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  intentCopy: {
    flex: 1,
    minWidth: 0,
  },
});
