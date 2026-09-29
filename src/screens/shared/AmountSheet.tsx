import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, NumberField, Sheet, Text } from '@/components';
import { TRACKER_LIMITS, type Tracker } from '@/domain';
import { formatNumber } from '@/format';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';

type AmountSheetProps = {
  tracker: Tracker | null;
  onClose: () => void;
  onAdd: (amount: number) => void;
};

/** Add any amount at once (long-press on +), for pages, reps, money and similar. */
export function AmountSheet({ tracker, onClose, onAdd }: AmountSheetProps) {
  const { t } = useTranslation();
  const { language } = usePreferences();
  const theme = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const step = tracker?.step ?? 1;
  const quick = [step * 2, step * 5, step * 10, step * 20].filter((value) => value <= TRACKER_LIMITS.entryAmountMax);
  const value = amount ?? step;

  const close = () => {
    setAmount(null);
    onClose();
  };

  return (
    <Sheet
      visible={tracker !== null}
      title={tracker ? `${t('detail.addAmount')} · ${tracker.name}` : t('detail.addAmount')}
      onClose={close}
      footer={
        <Button
          testID="amount-add"
          title={t('entry.addButton', { amount: formatNumber(value, language) })}
          disabled={value < 1}
          fill={tracker ? { background: theme.tone(tracker.color).solid, label: theme.tone(tracker.color).onSolid } : undefined}
          onPress={() => {
            onAdd(value);
            setAmount(null);
          }}
        />
      }
    >
      <NumberField
        label={t('entry.amount')}
        value={value}
        onChange={(next) => setAmount(next ?? 1)}
        min={1}
        max={TRACKER_LIMITS.entryAmountMax}
        step={step}
        suffix={tracker?.unit ?? undefined}
      />
      <View>
        <Text variant="label" tone="inkSecondary" style={styles.quickLabel}>
          {t('entry.quickAmounts')}
        </Text>
        <View style={styles.quick}>
          {quick.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={t('entry.addButton', { amount: formatNumber(option, language) })}
              onPress={() => setAmount(option)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderRadius: theme.radius.md,
                  backgroundColor: value === option ? theme.colors.ink : pressed ? theme.colors.lineStrong : theme.colors.sunken,
                },
              ]}
            >
              <Text variant="label" color={value === option ? theme.colors.canvas : theme.colors.ink}>
                {`+${formatNumber(option, language)}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  quickLabel: {
    marginBottom: 8,
  },
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
