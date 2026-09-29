import { useWindowDimensions } from 'react-native';

import { contentMaxWidth, getHorizontalPadding, getLayoutRange, type LayoutRange } from '@/theme/layout';

export type ResponsiveLayout = {
  width: number;
  height: number;
  range: LayoutRange;
  isCompact: boolean;
  horizontalPadding: number;
  /** Width available to content after padding, capped for tablets. */
  contentWidth: number;
};

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const range = getLayoutRange(width);
  const horizontalPadding = getHorizontalPadding(width);
  return {
    width,
    height,
    range,
    isCompact: range === 'compact',
    horizontalPadding,
    contentWidth: Math.min(contentMaxWidth, width) - horizontalPadding * 2,
  };
}
