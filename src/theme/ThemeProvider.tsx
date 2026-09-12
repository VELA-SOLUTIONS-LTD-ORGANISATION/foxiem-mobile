import { createContext, useContext, type ReactNode } from 'react';

import { colors, palette } from './colors';
import { fontFamily } from './fonts';
import { radius } from './radius';
import { shadows } from './shadows';
import { sizes } from './sizes';
import {
  contentMaxWidth,
  layoutBreakpoints,
  modalMaxWidth,
} from './layout';
import { screenPadding, sectionSpacing, space } from './spacing';
import { typography } from './typography';

export const theme = {
  palette,
  colors,
  typography,
  space,
  screenPadding,
  sectionSpacing,
  contentMaxWidth,
  modalMaxWidth,
  layoutBreakpoints,
  radius,
  shadows,
  sizes,
  fontFamily,
} as const;

export type Theme = typeof theme;

const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
