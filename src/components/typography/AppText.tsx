import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '@/theme';

const WEIGHT_TO_FAMILY = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
} as const;

type FontWeightOverride = keyof typeof WEIGHT_TO_FAMILY;

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  weight?: FontWeightOverride;
};

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  align,
  weight,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        {
          color: colors[color],
          textAlign: align,
          fontFamily: weight ? WEIGHT_TO_FAMILY[weight] : typography[variant].fontFamily,
          fontWeight: weight ?? typography[variant].fontWeight,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
