import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/navigation/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { colors, space } from '@/theme';

type ProfileStackScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  keyboardAware?: boolean;
  scroll?: boolean;
};

export function ProfileStackScreen({
  title,
  subtitle,
  children,
  keyboardAware = false,
  scroll = true,
}: ProfileStackScreenProps) {
  return (
    <Screen
      scroll={scroll}
      constrained
      keyboardAware={keyboardAware}
      maxWidth={520}
      backgroundColor={colors.background}
      contentStyle={styles.screenFill}
      scrollContentStyle={styles.scrollFill}
    >
      <View style={styles.container}>
        <AppHeader title={title} subtitle={subtitle} align="center" />
        {children}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenFill: {
    flexGrow: 1,
  },
  scrollFill: {
    flexGrow: 1,
    paddingBottom: space[8],
  },
  container: {
    width: '100%',
    flexGrow: 1,
    gap: space[5],
  },
});
