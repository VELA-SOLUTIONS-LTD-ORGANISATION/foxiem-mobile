import { space } from './spacing';

export const layoutBreakpoints = {
  compactMax: 360,
  largePhoneMin: 430,
  tabletMin: 768,
} as const;

/** Phone content column. Tablets use `getContentMaxWidth`. */
export const contentMaxWidth = 560;
export const tabletContentMaxWidth = 840;

export type LayoutRange = 'compact' | 'standard' | 'largePhone' | 'tablet';

export function getLayoutRange(width: number): LayoutRange {
  if (width >= layoutBreakpoints.tabletMin) {
    return 'tablet';
  }
  if (width < layoutBreakpoints.compactMax) {
    return 'compact';
  }
  if (width >= layoutBreakpoints.largePhoneMin) {
    return 'largePhone';
  }
  return 'standard';
}

export function getContentMaxWidth(width: number): number {
  if (getLayoutRange(width) === 'tablet') {
    return Math.min(tabletContentMaxWidth, width);
  }
  return contentMaxWidth;
}

export function getHorizontalPadding(width: number): number {
  const range = getLayoutRange(width);
  if (range === 'compact') {
    return space[3];
  }
  if (range === 'tablet') {
    return space[8];
  }
  if (range === 'largePhone') {
    return space[5];
  }
  return space[4];
}
