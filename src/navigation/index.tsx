import { DefaultTheme, NavigationContainer } from '@react-navigation/native';

import { colors } from '@/theme';

import { navigationRef } from './ref';
import { RootNavigator } from './RootNavigator';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
  },
};

export function AppNavigation() {
  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
