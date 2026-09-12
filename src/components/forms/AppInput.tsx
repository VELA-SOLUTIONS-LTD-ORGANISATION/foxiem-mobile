import { forwardRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, sizes, space, typography } from '@/theme';

type AppInputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  helperText?: string;
  errorMessage?: string;
  disabled?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  maxLength?: number;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  onBlur?: () => void;
  ariaLabel?: string;
};

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  {
    label,
    placeholder,
    value,
    onChangeText,
    helperText,
    errorMessage,
    disabled = false,
    leading,
    trailing,
    secureTextEntry,
    keyboardType,
    multiline = false,
    autoCapitalize,
    autoCorrect,
    autoComplete,
    returnKeyType,
    maxLength,
    onSubmitEditing,
    onBlur,
    ariaLabel,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(errorMessage);

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" color="textSecondary">
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          value.length > 0 && styles.filled,
          focused && styles.focused,
          hasError && styles.error,
          disabled && styles.disabled,
        ]}
      >
        {leading}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          maxLength={maxLength}
          blurOnSubmit={returnKeyType !== 'next'}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          style={[styles.input, multiline && styles.multiline]}
          underlineColorAndroid="transparent"
          aria-disabled={disabled}
          aria-invalid={hasError}
          aria-label={ariaLabel ?? label}
        />
        {trailing}
      </View>
      {hasError || helperText ? (
        <View style={styles.message}>
          <AppText variant="caption" color={hasError ? 'error' : 'textMuted'}>
            {hasError ? errorMessage : helperText}
          </AppText>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
    gap: space[1],
  },
  field: {
    minHeight: sizes.inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  focused: {
    borderColor: colors.primary,
  },
  filled: {
    borderColor: colors.border,
  },
  error: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  disabled: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.disabled,
  },
  message: {
    minHeight: typography.caption.lineHeight,
  },
  input: {
    flex: 1,
    margin: 0,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  multiline: {
    minHeight: sizes.controlLg * 2,
    textAlignVertical: 'top',
  },
});
