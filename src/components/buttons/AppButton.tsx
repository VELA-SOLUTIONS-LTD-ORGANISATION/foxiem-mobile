import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, sizes, space } from '@/theme';

export type AppButtonVariant = 'primary' | 'dark' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type AppButtonSize = 'sm' | 'md';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      role="button"
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles[`${variant}Pressed`],
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textOnPrimary}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <AppText
            variant="button"
            align="center"
            color={
              variant === 'outline' || variant === 'ghost'
                ? 'primary'
                : variant === 'secondary'
                  ? 'textOnPrimary'
                  : 'textOnPrimary'
            }
          >
            {title}
          </AppText>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.touchMin,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  sm: {
    minHeight: sizes.buttonHeightSm,
  },
  md: {
    minHeight: sizes.buttonHeight,
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  dark: {
    backgroundColor: colors.dark,
  },
  darkPressed: {
    backgroundColor: colors.darkPressed,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  secondaryPressed: {
    backgroundColor: colors.secondary,
    opacity: 0.88,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlinePressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: colors.primarySoft,
  },
  destructive: {
    backgroundColor: colors.error,
  },
  destructivePressed: {
    backgroundColor: colors.error,
    opacity: 0.88,
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabled,
    opacity: 1,
  },
});
