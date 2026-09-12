import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useResponsiveLayout } from '@/hooks';

type ContentContainerProps = {
  children: ReactNode;
  padded?: boolean;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function ContentContainer({
  children,
  padded = true,
  maxWidth,
  style,
}: ContentContainerProps) {
  const { horizontalPadding } = useResponsiveLayout();

  return (
    <View
      style={[
        styles.base,
        {
          paddingHorizontal: padded ? horizontalPadding : 0,
          maxWidth,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignSelf: 'center',
  },
});
