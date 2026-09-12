export const palette = {
  primary: '#3B82F6',
  secondary: '#6366F1',
  background: '#F8FAFF',
  surface: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  ink: '#0F172A',
} as const;

export const colors = {
  primary: palette.primary,
  primaryPressed: '#2563EB',
  primarySoft: '#EFF6FF',

  secondary: palette.secondary,
  secondarySoft: '#EEF2FF',

  background: palette.background,
  surface: palette.surface,
  surfaceSecondary: '#F1F5F9',

  success: palette.success,
  successSoft: '#ECFDF5',

  warning: palette.warning,
  warningSoft: '#FFFBEB',

  error: palette.error,
  errorSoft: '#FEF2F2',

  info: '#0EA5E9',
  infoSoft: '#F0F9FF',

  textPrimary: palette.ink,
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',

  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',

  dark: palette.ink,
  darkPressed: '#020617',

  disabled: '#CBD5E1',
  disabledText: '#94A3B8',

  overlay: 'transparent',
  backdrop: 'transparent',

  splashBackground: '#000000',
  splashText: '#FFFFFF',
  splashTextMuted: 'rgba(255, 255, 255, 0.72)',
} as const;

export type ColorToken = keyof typeof colors;
