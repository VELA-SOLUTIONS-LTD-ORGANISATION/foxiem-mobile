import { space } from './spacing';

export const layoutBreakpoints = {
  compactMax: 360,
  largePhoneMin: 430,
} as const;

/** Content never stretches wider than this on tablets and landscape. */
export const contentMaxWidth = 560;

export type LayoutRange = 'compact' | 'standard' | 'largePhone';

export function getLayoutRange(width: number): LayoutRange {
  if (width < layoutBreakpoints.compactMax) {
    return 'compact';
  }
  if (width >= layoutBreakpoints.largePhoneMin) {
    return 'largePhone';
  }
  return 'standard';
}

export function getHorizontalPadding(width: number): number {
  const range = getLayoutRange(width);
  if (range === 'compact') {
    return space[3];
  }
  if (range === 'largePhone') {
    return space[5];
  }
  return space[4];
}
