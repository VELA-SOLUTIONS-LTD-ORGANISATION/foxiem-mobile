import { Platform, type ViewStyle } from 'react-native';

function inkAlpha(opacity: number): string {
  return `rgba(15, 23, 42, ${opacity})`;
}

function createShadow(
  offsetY: number,
  blur: number,
  opacity: number,
  elevation: number,
): ViewStyle {
  const boxShadow = `0px ${offsetY}px ${blur}px ${inkAlpha(opacity)}`;

  return Platform.select<ViewStyle>({
    android: {
      boxShadow,
      elevation,
    },
    default: {
      boxShadow,
    },
  }) as ViewStyle;
}

export const shadows = {
  none: {
    boxShadow: 'none',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: createShadow(1, 3, 0.06, 1),
  md: createShadow(4, 10, 0.08, 3),
  lg: createShadow(8, 18, 0.1, 6),
} as const;

export type ShadowToken = keyof typeof shadows;
