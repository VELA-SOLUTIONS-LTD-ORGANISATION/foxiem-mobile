import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { MAX_FONT_SCALE, useTheme, type Palette, type TypographyVariant } from '@/theme';

type InkToken = 'ink' | 'inkSecondary' | 'inkTertiary' | 'inkDisabled' | 'onAction' | 'danger' | 'caution' | 'improvement' | 'brandInk';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: InkToken;
  color?: string;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', tone = 'ink', color, align, style, maxFontSizeMultiplier, ...rest }: TextProps) {
  const theme = useTheme();
  const resolved = color ?? theme.colors[tone as keyof Palette];
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
      {...rest}
      style={[theme.typography[variant], { color: resolved, textAlign: align }, style]}
    />
  );
}
