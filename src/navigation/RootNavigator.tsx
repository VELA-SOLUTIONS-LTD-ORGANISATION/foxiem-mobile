import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProfileSetupScreen } from '@/screens/profile';
import { SplashScreen } from '@/screens/Splash';

import { MainNavigator } from './MainNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Main" component={MainNavigator} />
    </Stack.Navigator>
  );
}
