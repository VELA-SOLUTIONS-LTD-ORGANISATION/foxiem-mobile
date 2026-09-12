import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

type DividerProps = {
  inset?: boolean;
};

export function Divider({ inset = false }: DividerProps) {
  return <View style={[styles.line, inset && styles.inset]} />;
}

const styles = StyleSheet.create({
  line: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  inset: {
    marginHorizontal: space[4],
  },
});
