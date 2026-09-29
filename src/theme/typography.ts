import type { TextStyle } from 'react-native';

import { fontFamily } from './fonts';

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Figtree for reading, Bricolage Grotesque for numerals and screen titles.
 * Custom font files carry their weight, so `fontWeight` stays 'normal' to avoid
 * Android synthesising a second bold.
 */
export const typography = {
  wordmark: { fontFamily: fontFamily.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  title: { fontFamily: fontFamily.displayBold, fontSize: 26, lineHeight: 31, letterSpacing: -0.4 },
  titleSmall: { fontFamily: fontFamily.displayBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.2 },
  heading: { fontFamily: fontFamily.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamily.medium, fontSize: 13.5, lineHeight: 18 },
  micro: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 21 },
  numberRow: { fontFamily: fontFamily.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, fontVariant: tabular },
  numberMetric: { fontFamily: fontFamily.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, fontVariant: tabular },
  numberSmall: { fontFamily: fontFamily.displayBold, fontSize: 17, lineHeight: 22, fontVariant: tabular },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Hero numeral size by digit count, so 7 and 12,845 both fit without shrinking to nothing. */
export function heroFontSize(text: string, availableWidth: number): number {
  const glyphs = Math.max(1, text.length);
  const byWidth = availableWidth / (glyphs * 0.62);
  return Math.max(56, Math.min(132, Math.floor(byWidth)));
}
