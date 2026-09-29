import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NumberField, Segmented, Text, TextField } from '@/components';
import { TRACKER_LIMITS, type TrackerDraft, type TrackerDraftError, type TrackerPeriod } from '@/domain';
import { describeGoal } from '@/format';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';

type GoalFieldsProps = {
  draft: TrackerDraft;
  onChange: (patch: Partial<TrackerDraft>) => void;
  error: TrackerDraftError | null;
  showSummary?: boolean;
};

export function errorMessage(error: TrackerDraftError | null, t: ReturnType<typeof useTranslation>['t']): string | undefined {
  return error ? t(`create.errors.${error}`) : undefined;
}

/** Only the questions that matter for the chosen intent. */
export function GoalFields({ draft, onChange, error, showSummary = true }: GoalFieldsProps) {
  const { t } = useTranslation();
  const { language } = usePreferences();
  const theme = useTheme();
  const targetError = error === 'targetRequired' || error === 'targetRange' ? errorMessage(error, t) : undefined;

  const periodOptions = (periods: readonly TrackerPeriod[]) =>
    periods.map((period) => ({ value: period, label: t(`periods.${period}`) }));

  return (
    <View style={styles.wrap}>
      {draft.intent === 'count' ? (
        <View style={styles.block}>
          <Text variant="label" tone="inkSecondary">
            {t('create.resets')}
          </Text>
          <Segmented
            accessibilityLabel={t('create.resets')}
            value={draft.period}
            onChange={(period) => onChange({ period })}
            options={[
              { value: 'all', label: t('create.resetsNever') },
              { value: 'day', label: t('periods.day') },
              { value: 'week', label: t('periods.week') },
              { value: 'month', label: t('periods.month') },
            ]}
          />
        </View>
      ) : null}

      {draft.intent === 'reach' || draft.intent === 'limit' ? (
        <>
          <NumberField
            testID="goal-target"
            label={draft.intent === 'reach' ? t('create.howMany') : t('create.limitQuestion')}
            value={draft.target}
            onChange={(target) => onChange({ target })}
            min={1}
            max={TRACKER_LIMITS.targetMax}
            suffix={draft.unit ?? undefined}
            error={targetError}
          />
          <View style={styles.block}>
            <Text variant="label" tone="inkSecondary">
              {t('create.every')}
            </Text>
            <Segmented
              accessibilityLabel={t('create.every')}
              value={draft.period}
              onChange={(period) => onChange({ period })}
              options={periodOptions(draft.intent === 'reach' ? ['day', 'week', 'month', 'all'] : ['day', 'week', 'month'])}
            />
          </View>
          <TextField
            label={`${t('create.unit')} · ${t('common.optional')}`}
            value={draft.unit ?? ''}
            onChangeText={(unit) => onChange({ unit })}
            placeholder={t('create.unitPlaceholder')}
            maxLength={TRACKER_LIMITS.unitMaxLength}
            autoCapitalize="none"
            returnKeyType="done"
            error={error === 'unitTooLong' ? errorMessage(error, t) : undefined}
          />
        </>
      ) : null}

      {draft.intent === 'reduce' ? (
        <>
          <View style={styles.block}>
            <Text variant="label" tone="inkSecondary">
              {t('create.compare')}
            </Text>
            <Segmented
              accessibilityLabel={t('create.compare')}
              value={draft.period}
              onChange={(period) => onChange({ period })}
              options={periodOptions(['day', 'week', 'month'])}
            />
          </View>
          <NumberField
            label={t(`create.usual.${draft.period === 'all' ? 'week' : draft.period}`)}
            value={draft.baseline}
            onChange={(baseline) => onChange({ baseline })}
            min={0}
            max={TRACKER_LIMITS.targetMax}
            allowEmpty
            hint={t('create.usualHint')}
            error={error === 'baselineRange' ? errorMessage(error, t) : undefined}
          />
        </>
      ) : null}

      {draft.intent === 'consistency' ? (
        <NumberField
          testID="goal-rhythm"
          label={t('create.howOften')}
          value={draft.target}
          onChange={(target) => onChange({ target })}
          min={1}
          max={7}
          suffix={(draft.target ?? 7) >= 7 ? t('create.everyDay') : t('create.daysAWeek', { count: draft.target ?? 7 }).replace(/^\d+\s*/, '')}
          error={targetError}
        />
      ) : null}

      {showSummary ? (
        <View style={[styles.summary, { backgroundColor: theme.colors.sunken, borderRadius: theme.radius.md }]}>
          <Text variant="caption" tone="inkSecondary">
            {t('create.summary')}
          </Text>
          <Text variant="bodyStrong" accessibilityLiveRegion="polite">
            {describeGoal(draft, t, language)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 20,
  },
  block: {
    gap: 8,
  },
  summary: {
    padding: 14,
    gap: 2,
  },
});
