import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { MAX_FONT_SCALE, useTheme } from '@/theme';

import { Text } from './Text';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  hint?: string;
  leading?: React.ReactNode;
  hideLabel?: boolean;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, leading, hideLabel = false, multiline, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {hideLabel ? null : (
        <Text variant="label" tone="inkSecondary">
          {label}
        </Text>
      )}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          {
            borderRadius: theme.radius.md,
            borderColor: error ? theme.colors.danger : focused ? theme.colors.ink : theme.colors.line,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        {leading}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.inkTertiary}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          multiline={multiline}
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          style={[
            theme.typography.body,
            styles.input,
            multiline && styles.inputMultiline,
            { color: theme.colors.ink },
          ]}
        />
      </View>
      {error || hint ? (
        <Text variant="caption" tone={error ? 'danger' : 'inkTertiary'} accessibilityLiveRegion={error ? 'polite' : undefined}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  multiline: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
