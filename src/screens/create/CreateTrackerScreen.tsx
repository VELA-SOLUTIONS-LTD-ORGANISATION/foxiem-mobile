import { Ionicons } from '@expo/vector-icons';
import { CommonActions, usePreventRemove } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Header, NumberField, Screen, Text, TextField, TrackerIcon } from '@/components';
import { animateNextLayout } from '@/components/motion';
import { useReducedMotion } from '@/hooks';
import {
  TRACKER_LIMITS,
  coerceDraftForIntent,
  defaultPeriodFor,
  draftFromTemplate,
  emptyDraft,
  findTemplate,
  pickColor,
  suggestIcon,
  validateDraft,
  DEFAULT_TRACKER_ICON,
  type TrackerDraft,
  type TrackerDraftError,
  type TrackerIntent,
} from '@/domain';
import type { RootScreenProps } from '@/navigation/types';
import { useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

import { AppearanceFields } from '../shared/AppearanceFields';
import { errorMessage, GoalFields } from '../shared/GoalFields';
import { INTENT_ICONS, IntentOptions } from '../shared/IntentOptions';

type Step = 1 | 2 | 3;

const NAME_ERRORS: readonly TrackerDraftError[] = ['nameRequired', 'nameTooLong', 'nameDuplicate', 'trackerLimit'];

export function CreateTrackerScreen({ navigation, route }: RootScreenProps<'CreateTracker'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { trackers, createTracker, firstRunCompleted, completeFirstRun } = useTrackerStore();
  const template = findTemplate(route.params?.templateId);
  const firstRun = Boolean(route.params?.firstRun) && !firstRunCompleted;

  const [draft, setDraft] = useState<TrackerDraft>(() => {
    if (template) {
      return draftFromTemplate(template, {
        name: t(`start.templates.${template.id}` as 'start.templates.coffee'),
        unit: template.unitKey ? t(template.unitKey) : null,
      });
    }
    return emptyDraft({ color: pickColor(trackers) });
  });
  const initialStep: Step = template ? 3 : 1;
  const [step, setStep] = useState<Step>(initialStep);
  const [intentChosen, setIntentChosen] = useState<boolean>(Boolean(template));
  const [iconTouched, setIconTouched] = useState<boolean>(Boolean(template));
  const [error, setError] = useState<TrackerDraftError | null>(null);
  const [showMore, setShowMore] = useState(false);
  const reduceMotion = useReducedMotion();
  const [created, setCreated] = useState(false);
  const nameRef = useRef<TextInput>(null);

  const update = (patch: Partial<TrackerDraft>) => {
    setError(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  usePreventRemove(step !== initialStep && !created, () => {
    setStep((current) => (current > 1 ? ((current - 1) as Step) : current));
  });

  const nameError = error && NAME_ERRORS.includes(error) ? errorMessage(error, t) : undefined;

  const goToIntent = () => {
    const problem = validateDraft({ ...draft, intent: 'count', period: 'all', target: null }, trackers);
    if (problem && NAME_ERRORS.includes(problem)) {
      setError(problem);
      return;
    }
    setStep(2);
  };

  const chooseIntent = (intent: TrackerIntent) => {
    setIntentChosen(true);
    setDraft((current) => coerceDraftForIntent({ ...current, period: defaultPeriodFor(intent) }, intent));
    setError(null);
    setStep(3);
  };

  const create = () => {
    const result = createTracker(draft);
    if (result.error) {
      setError(result.error);
      if (NAME_ERRORS.includes(result.error) && template) {
        nameRef.current?.focus();
      } else if (NAME_ERRORS.includes(result.error)) {
        setStep(1);
      }
      return;
    }
    setCreated(true);
    if (firstRun) {
      void completeFirstRun();
    }
    // Home sits underneath, so Back from the new tracker lands where counting happens.
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'Main', params: { screen: 'HomeTab' } },
          { name: 'TrackerDetail', params: { trackerId: result.tracker.id } },
        ],
      }),
    );
  };

  const title = step === 1 ? t('create.stepName') : step === 2 ? t('create.stepIntent') : t('create.stepSetup');
  const totalSteps = template ? 1 : 3;
  const shownStep = template ? 1 : step;

  const footer =
    step === 1 ? (
      <Button
        testID="create-continue"
        title={t('common.continue')}
        disabled={draft.name.trim().length === 0}
        onPress={goToIntent}
      />
    ) : step === 3 ? (
      <Button testID="create-submit" title={t('create.cta')} onPress={create} />
    ) : null;

  return (
    <Screen keyboard edges={['top', 'bottom', 'left', 'right']} footer={footer}>
      <Header
        back={step === initialStep ? 'close' : true}
        onBack={() => (step === initialStep ? navigation.goBack() : setStep((step - 1) as Step))}
        title={t('create.title')}
        subtitle={totalSteps > 1 ? t('create.stepOf', { step: shownStep, total: totalSteps }) : undefined}
      />
      {totalSteps > 1 ? (
        <View style={styles.progress} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {[1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                { backgroundColor: index <= step ? theme.colors.ink : theme.colors.line, borderRadius: 2 },
              ]}
            />
          ))}
        </View>
      ) : null}

      <Text variant="title" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>

      {step === 1 ? (
        <View style={styles.stack}>
          <TextField
            ref={nameRef}
            testID="create-name"
            label={t('create.nameLabel')}
            value={draft.name}
            autoFocus
            placeholder={t('create.namePlaceholder')}
            maxLength={TRACKER_LIMITS.nameMaxLength + 5}
            returnKeyType="next"
            onSubmitEditing={goToIntent}
            error={nameError}
            leading={<TrackerIcon icon={draft.icon} color={draft.color} size={36} />}
            onChangeText={(name) =>
              update(iconTouched ? { name } : { name, icon: suggestIcon(name) ?? DEFAULT_TRACKER_ICON })
            }
          />
          <AppearanceFields
            icon={draft.icon}
            color={draft.color}
            onChange={(patch) => {
              if (patch.icon) {
                setIconTouched(true);
              }
              update(patch);
            }}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <IntentOptions value={intentChosen ? draft.intent : null} onSelect={chooseIntent} />
      ) : null}

      {step === 3 ? (
        <View style={styles.stack}>
          {template ? (
            <TextField
              ref={nameRef}
              testID="create-name"
              label={t('create.nameLabel')}
              value={draft.name}
              maxLength={TRACKER_LIMITS.nameMaxLength + 5}
              returnKeyType="done"
              error={nameError}
              leading={<TrackerIcon icon={draft.icon} color={draft.color} size={36} />}
              onChangeText={(name) => update({ name })}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t(`intents.${draft.intent}.title`)}. ${t('trackerSettings.changeIntent')}`}
            onPress={() => setStep(2)}
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

          <GoalFields draft={draft} onChange={update} error={error} />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showMore }}
            onPress={() => {
              animateNextLayout(reduceMotion);
              setShowMore((value) => !value);
            }}
            style={styles.moreToggle}
          >
            <Text variant="label">{showMore ? t('create.fewerOptions') : t('create.moreOptions')}</Text>
            <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.ink} />
          </Pressable>

          {showMore ? (
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
                  error={error === 'unitTooLong' ? errorMessage(error, t) : undefined}
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
                  error={error === 'startingValueRange' ? errorMessage(error, t) : undefined}
                />
              ) : null}
              <TextField
                label={`${t('create.notes')} · ${t('common.optional')}`}
                value={draft.notes}
                onChangeText={(notes) => update({ notes })}
                placeholder={t('create.notesPlaceholder')}
                multiline
                maxLength={TRACKER_LIMITS.notesMaxLength}
              />
              {template ? <AppearanceFields icon={draft.icon} color={draft.color} onChange={update} /> : null}
            </View>
          ) : null}
          {error && !NAME_ERRORS.includes(error) && error !== 'targetRequired' && error !== 'targetRange' ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {errorMessage(error, t)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
  },
  title: {
    marginTop: 12,
    marginBottom: 20,
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
  moreToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
