import { space } from './spacing';

export const layoutBreakpoints = {
  compactMax: 360,
  largePhoneMin: 430,
} as const;

export const contentMaxWidth = 600;
export const modalMaxWidth = 420;
export const gridDefaultColumns = 2;

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

export function getGridItemWidth({
  containerWidth,
  columns = gridDefaultColumns,
  gap = space[3],
  horizontalPadding = 0,
}: {
  containerWidth: number;
  columns?: number;
  gap?: number;
  horizontalPadding?: number;
}): number {
  const safeColumns = Math.max(1, columns);
  const totalGaps = gap * Math.max(0, safeColumns - 1);
  return (containerWidth - horizontalPadding - totalGaps) / safeColumns;
}
