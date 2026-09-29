import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MAX_FONT_SCALE, useTheme } from '@/theme';

import { Text } from './Text';

type NumberFieldProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
  error?: string;
  allowEmpty?: boolean;
  testID?: string;
};

function parse(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

/** Whole numbers only; steppers are 48 pt and the field accepts typing for large values. */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1_000_000,
  step = 1,
  suffix,
  hint,
  error,
  allowEmpty = false,
  testID,
}: NumberFieldProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const current = value ?? 0;

  const stepper = (direction: -1 | 1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 1 ? t('create.increase', { label }) : t('create.decrease', { label })}
      disabled={direction === -1 ? current <= min : current >= max}
      onPress={() => onChange(clamp(current + direction * step))}
      style={({ pressed }) => [
        styles.stepper,
        { borderRadius: theme.radius.md, backgroundColor: pressed ? theme.colors.lineStrong : theme.colors.sunken },
        (direction === -1 ? current <= min : current >= max) && styles.disabled,
      ]}
    >
      <Ionicons name={direction === 1 ? 'add' : 'remove'} size={24} color={theme.colors.ink} />
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="inkSecondary">
        {label}
      </Text>
      <View style={styles.row}>
        {stepper(-1)}
        <View
          style={[
            styles.field,
            {
              borderRadius: theme.radius.md,
              borderColor: error ? theme.colors.danger : focused ? theme.colors.ink : theme.colors.line,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <TextInput
            testID={testID}
            accessibilityLabel={label}
            value={value === null ? '' : String(value)}
            onChangeText={(text) => {
              const parsed = parse(text);
              onChange(parsed === null ? (allowEmpty ? null : min) : Math.min(max, parsed));
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              if (value !== null && value < min) {
                onChange(min);
              }
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            maxLength={String(max).length}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            placeholder={allowEmpty ? '—' : undefined}
            placeholderTextColor={theme.colors.inkTertiary}
            style={[theme.typography.numberMetric, styles.input, { color: theme.colors.ink }]}
          />
          {suffix ? (
            <Text variant="body" tone="inkSecondary" numberOfLines={1} style={styles.suffix}>
              {suffix}
            </Text>
          ) : null}
        </View>
        {stepper(1)}
      </View>
      {error || hint ? (
        <Text variant="caption" tone={error ? 'danger' : 'inkTertiary'}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepper: {
    width: 52,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  field: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 6,
  },
  input: {
    flex: 1,
    minWidth: 40,
    paddingVertical: 8,
    textAlign: 'center',
  },
  suffix: {
    maxWidth: '50%',
  },
});
