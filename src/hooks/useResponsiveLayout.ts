import { useWindowDimensions } from 'react-native';

import {
  contentMaxWidth,
  getGridItemWidth,
  getHorizontalPadding,
  getLayoutRange,
  gridDefaultColumns,
  modalMaxWidth,
  type LayoutRange,
} from '@/theme/layout';

export type ResponsiveLayout = {
  width: number;
  height: number;
  range: LayoutRange;
  isCompact: boolean;
  isStandard: boolean;
  isLargePhone: boolean;
  horizontalPadding: number;
  contentMaxWidth: number;
  modalMaxWidth: number;
  getGridItemWidth: (options?: {
    columns?: number;
    gap?: number;
    horizontalPadding?: number;
  }) => number;
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
    isStandard: range === 'standard',
    isLargePhone: range === 'largePhone',
    horizontalPadding,
    contentMaxWidth,
    modalMaxWidth,
    getGridItemWidth: (options) =>
      getGridItemWidth({
        containerWidth: width,
        columns: options?.columns ?? gridDefaultColumns,
        gap: options?.gap,
        horizontalPadding: options?.horizontalPadding ?? horizontalPadding * 2,
      }),
  };
}
