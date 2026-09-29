import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, useColorScheme, type ViewStyle } from 'react-native';

import type { TrackerColor } from '@/domain/types';

import { fontFamily } from './fonts';
import { darkPalette, lightPalette, trackerTone, type ColorScheme, type Palette, type TrackerTone } from './palette';
import { motion, radius, sizes, space } from './spacing';
import { typography } from './typography';

export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  typography: typeof typography;
  space: typeof space;
  radius: typeof radius;
  sizes: typeof sizes;
  motion: typeof motion;
  fontFamily: typeof fontFamily;
  tone: (color: TrackerColor) => TrackerTone;
  /** Only floating layers (snackbar, sheets) get a shadow. */
  floating: ViewStyle;
};

function buildTheme(scheme: ColorScheme): Theme {
  const colors = scheme === 'dark' ? darkPalette : lightPalette;
  const shadowColor = scheme === 'dark' ? '0, 0, 0' : '12, 14, 16';
  const floating: ViewStyle = Platform.select<ViewStyle>({
    android: {
      elevation: 8,
      boxShadow: `0px 8px 24px rgba(${shadowColor}, ${scheme === 'dark' ? 0.5 : 0.16})`,
    },
    default: {
      boxShadow: `0px 8px 24px rgba(${shadowColor}, ${scheme === 'dark' ? 0.5 : 0.16})`,
    },
  }) as ViewStyle;
  return {
    scheme,
    colors,
    typography,
    space,
    radius,
    sizes,
    motion,
    fontFamily,
    tone: (color) => trackerTone(color, scheme),
    floating,
  };
}

const LIGHT_THEME = buildTheme('light');
const DARK_THEME = buildTheme('dark');

const ThemeContext = createContext<Theme>(LIGHT_THEME);

export type AppearancePreference = 'system' | 'light' | 'dark';

export function resolveScheme(appearance: AppearancePreference, system: string | null | undefined): ColorScheme {
  if (appearance === 'light' || appearance === 'dark') {
    return appearance;
  }
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({
  appearance = 'system',
  children,
}: {
  appearance?: AppearancePreference;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const scheme = resolveScheme(appearance, system);
  return (
    <ThemeContext.Provider value={scheme === 'dark' ? DARK_THEME : LIGHT_THEME}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** `const styles = useThemedStyles(makeStyles)` — styles are built once per scheme. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
}
