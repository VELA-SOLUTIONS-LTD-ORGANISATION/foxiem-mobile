import type { TrackerColor } from '@/domain/types';

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  canvas: string;
  surface: string;
  sunken: string;
  /** Unfilled part of meters and bars. */
  track: string;
  /** Selected option inside a segmented control. */
  selected: string;
  line: string;
  lineStrong: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  inkDisabled: string;
  /** Primary actions: ink in light mode, near-white in dark mode. */
  action: string;
  actionPressed: string;
  onAction: string;
  brand: string;
  brandInk: string;
  improvement: string;
  improvementSoft: string;
  caution: string;
  cautionSoft: string;
  danger: string;
  dangerSoft: string;
  focus: string;
  scrim: string;
  toast: string;
  onToast: string;
};

export type TrackerTone = {
  /** Fills: progress, pressed keys, detail + key. */
  solid: string;
  /** Tile and resting key background. */
  soft: string;
  /** Text-safe colour for icons and labels on surface/soft. */
  ink: string;
  /** Label colour on `solid`. */
  onSolid: string;
};

export const lightPalette: Palette = {
  canvas: '#F3F4F1',
  surface: '#FFFFFF',
  sunken: '#ECEDEA',
  track: '#E4E6E1',
  selected: '#FFFFFF',
  line: '#E2E4DF',
  lineStrong: '#CDD0CA',
  ink: '#15171A',
  inkSecondary: '#50555C',
  inkTertiary: '#6B7078',
  inkDisabled: '#A3A7AC',
  action: '#15171A',
  actionPressed: '#34383E',
  onAction: '#FFFFFF',
  brand: '#E2622A',
  brandInk: '#B84A17',
  improvement: '#2E7D4B',
  improvementSoft: '#E4F2E9',
  caution: '#9A5B00',
  cautionSoft: '#FBEFD9',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  focus: '#2F6BC4',
  scrim: 'rgba(12, 14, 16, 0.42)',
  toast: '#15171A',
  onToast: '#F2F3F0',
};

export const darkPalette: Palette = {
  canvas: '#0E1012',
  surface: '#171A1D',
  sunken: '#1F2327',
  track: '#30353B',
  selected: '#343A40',
  line: '#2A2F34',
  lineStrong: '#3A4046',
  ink: '#F2F3F0',
  inkSecondary: '#B6BBC1',
  inkTertiary: '#8E949B',
  inkDisabled: '#5C6268',
  action: '#F2F3F0',
  actionPressed: '#D6D8D4',
  onAction: '#15171A',
  brand: '#F2804E',
  brandInk: '#FF9A6B',
  improvement: '#6FCB8F',
  improvementSoft: '#16301F',
  caution: '#F0B45A',
  cautionSoft: '#33260F',
  danger: '#FF8A80',
  dangerSoft: '#3A1715',
  focus: '#8BB6F5',
  scrim: 'rgba(0, 0, 0, 0.6)',
  toast: '#F2F3F0',
  onToast: '#15171A',
};

const LIGHT_TONES: Record<TrackerColor, TrackerTone> = {
  fox: { solid: '#E2622A', soft: '#FCE8DE', ink: '#A8431A', onSolid: '#FFFFFF' },
  honey: { solid: '#D69414', soft: '#FBF0D6', ink: '#8A5E00', onSolid: '#15171A' },
  leaf: { solid: '#3E9B5F', soft: '#E2F2E7', ink: '#25703F', onSolid: '#FFFFFF' },
  teal: { solid: '#1E9690', soft: '#DDF1F0', ink: '#0F6763', onSolid: '#FFFFFF' },
  sky: { solid: '#3D7FE0', soft: '#E1ECFB', ink: '#2459A8', onSolid: '#FFFFFF' },
  iris: { solid: '#7A5BD6', soft: '#ECE7FA', ink: '#5A3DB0', onSolid: '#FFFFFF' },
  berry: { solid: '#D2457A', soft: '#FBE4EC', ink: '#A12B5A', onSolid: '#FFFFFF' },
  cocoa: { solid: '#8B5E3C', soft: '#F1E8E1', ink: '#6A4428', onSolid: '#FFFFFF' },
  slate: { solid: '#5E6B7A', soft: '#E7EAEE', ink: '#414C58', onSolid: '#FFFFFF' },
};

const DARK_TONES: Record<TrackerColor, TrackerTone> = {
  fox: { solid: '#F2804E', soft: '#3A2419', ink: '#FF9A6B', onSolid: '#1A0D06' },
  honey: { solid: '#EDB23E', soft: '#33270F', ink: '#F5C665', onSolid: '#1C1402' },
  leaf: { solid: '#56B878', soft: '#16301F', ink: '#7DD39A', onSolid: '#061A0D' },
  teal: { solid: '#3DB9B2', soft: '#0F2D2C', ink: '#66D2CB', onSolid: '#031716' },
  sky: { solid: '#5B96EE', soft: '#172838', ink: '#8BB6F5', onSolid: '#06121F' },
  iris: { solid: '#9C83EC', soft: '#241D3A', ink: '#BCA9F5', onSolid: '#120A22' },
  berry: { solid: '#EC6F9C', soft: '#3A1726', ink: '#F59BBB', onSolid: '#22060F' },
  cocoa: { solid: '#B98A66', soft: '#2E231B', ink: '#D4AE8F', onSolid: '#170E07' },
  slate: { solid: '#8C99A8', soft: '#22272D', ink: '#B3BECA', onSolid: '#0B0E12' },
};

export function trackerTone(color: TrackerColor, scheme: ColorScheme): TrackerTone {
  return (scheme === 'dark' ? DARK_TONES : LIGHT_TONES)[color] ?? LIGHT_TONES.fox;
}
