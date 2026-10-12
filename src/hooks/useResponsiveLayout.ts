import { useWindowDimensions } from 'react-native';

import { getContentMaxWidth, getHorizontalPadding, getLayoutRange, type LayoutRange } from '@/theme/layout';

export type ResponsiveLayout = {
  width: number;
  height: number;
  range: LayoutRange;
  isCompact: boolean;
  isTablet: boolean;
  horizontalPadding: number;
  contentMaxWidth: number;
  /** Width available to content after padding, capped for the current range. */
  contentWidth: number;
};

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const range = getLayoutRange(width);
  const horizontalPadding = getHorizontalPadding(width);
  const maxWidth = getContentMaxWidth(width);
  return {
    width,
    height,
    range,
    isCompact: range === 'compact',
    isTablet: range === 'tablet',
    horizontalPadding,
    contentMaxWidth: maxWidth,
    contentWidth: Math.min(maxWidth, width) - horizontalPadding * 2,
  };
}
